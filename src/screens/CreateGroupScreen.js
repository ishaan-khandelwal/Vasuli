import React, { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, gradients } from '../constants/colors';
import { categories } from '../constants/categories';
import CategoryChip from '../components/CategoryChip';
import GlassCard from '../components/GlassCard';
import ContactPhonePickerModal from '../components/ContactPhonePickerModal';
import { createLocalId } from '../utils/storage';
import { normalizePhoneInput } from '../utils/formatters';
import { runHapticSuccess } from '../utils/native';
import { pickPhoneContact } from '../utils/contacts';

export default function CreateGroupScreen() {
  const navigation = useNavigation();
  const { createGroup } = useApp();
  const { showToast } = useToast();
  const scrollRef = useRef(null);
  const groupNameRef = useRef(null);
  const descriptionRef = useRef(null);
  const memberNameRefs = useRef({});
  const memberPhoneRefs = useRef({});
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Trip');
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState([
    { id: createLocalId(), name: 'You', phone: '', isOrganizer: true },
    { id: createLocalId(), name: '', phone: '', isOrganizer: false },
  ]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickingContactMemberId, setPickingContactMemberId] = useState(null);
  const [pendingMemberContact, setPendingMemberContact] = useState(null);

  const scrollToFocusedField = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: Platform.OS === 'ios' });
    });
  };

  const handleDateChange = (event, nextDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);

      if (event.type !== 'set' || !nextDate) {
        return;
      }
    }

    if (nextDate) {
      setDate(nextDate);
    }
  };

  const openDatePicker = () => {
    Keyboard.dismiss();

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        display: 'default',
        onChange: handleDateChange,
      });
      return;
    }

    setShowPicker((current) => !current);
  };

  const updateMember = (memberId, patch) => {
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId
          ? { ...member, ...patch }
          : patch.isOrganizer
            ? { ...member, isOrganizer: false }
            : member
      )
    );
  };

  const addMember = () => {
    if (members.length >= 20) return;
    const nextMember = { id: createLocalId(), name: '', phone: '', isOrganizer: false };
    setMembers((current) => [...current, nextMember]);
    requestAnimationFrame(() => {
      scrollToFocusedField();
      setTimeout(() => memberNameRefs.current[nextMember.id]?.focus(), 150);
    });
  };

  const removeMember = (memberId) => {
    if (members.length <= 2) return;
    setMembers((current) => current.filter((member) => member.id !== memberId));
  };

  const applyPickedMemberContact = (memberId, pickedContact, phone) => {
    const patch = { phone };

    if (pickedContact?.name) {
      patch.name = pickedContact.name;
    }

    updateMember(memberId, patch);
    showToast(`Filled details from ${pickedContact?.name || 'contact'}`);
  };

  const closePendingMemberContact = () => {
    setPendingMemberContact(null);
  };

  const handlePickMemberContact = async (memberId) => {
    if (pickingContactMemberId) return;

    setPickingContactMemberId(memberId);
    try {
      const pickedContact = await pickPhoneContact();
      if (!pickedContact) {
        return;
      }

      if ((pickedContact.phoneOptions?.length || 0) > 1) {
        setPendingMemberContact({
          memberId,
          contact: pickedContact,
        });
        return;
      }

      applyPickedMemberContact(memberId, pickedContact, pickedContact.phone);
    } catch (error) {
      showToast(error?.message || 'Could not open contacts');
    } finally {
      setPickingContactMemberId(null);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Group name required', 'Enter a group name to continue.');
      return;
    }

    const cleanedMembers = members
      .map((member) => ({
        ...member,
        name: member.name.trim(),
        phone: normalizePhoneInput(member.phone),
      }))
      .filter((member) => member.name && member.phone);

    if (cleanedMembers.length < 2) {
      Alert.alert('Members missing', 'Add at least 2 valid members.');
      return;
    }

    if (!cleanedMembers.some((member) => member.isOrganizer)) {
      cleanedMembers[0].isOrganizer = true;
    }

    await runHapticSuccess();

    const group = {
      id: createLocalId(),
      name: name.trim(),
      category,
      date: date.toISOString(),
      description: description.trim(),
      members: cleanedMembers,
      expenses: [],
      settlements: [],
      createdAt: new Date().toISOString(),
    };

    await createGroup(group);
    navigation.replace('GroupDetail', { groupId: group.id });
  };

  const focusNextMemberField = (index, field) => {
    const nextMember = members[index + 1];
    if (field === 'name') {
      memberPhoneRefs.current[members[index]?.id]?.focus();
      return;
    }

    if (nextMember) {
      memberNameRefs.current[nextMember.id]?.focus();
      return;
    }

    descriptionRef.current?.focus();
  };

  return (
    <LinearGradient colors={gradients.appBackground} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>New Group</Text>
          <Text style={styles.subtitle}>Bring people in, then let Vasuli handle the math.</Text>

          <GlassCard style={styles.section}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              ref={groupNameRef}
              placeholder="Goa Trip"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              onSubmitEditing={() => descriptionRef.current?.focus()}
              returnKeyType="next"
              style={styles.input}
            />
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categories.map((item) => (
                <CategoryChip key={item.key} item={item} selected={item.key === category} onPress={() => setCategory(item.key)} />
              ))}
            </ScrollView>
            <Text style={styles.label}>Date</Text>
            <Pressable style={styles.input} onPress={openDatePicker}>
              <Text style={styles.inputText}>{date.toDateString()}</Text>
            </Pressable>
            {showPicker && Platform.OS === 'ios' ? (
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
              />
            ) : null}
            <Text style={styles.label}>{category === 'Other' ? 'What is this for?' : 'Description'}</Text>
            <TextInput
              ref={descriptionRef}
              placeholder={category === 'Other' ? 'Explain what this group is for' : 'What is this group for?'}
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              onFocus={scrollToFocusedField}
              returnKeyType="done"
              style={[styles.input, styles.textarea]}
              multiline
            />
          </GlassCard>

          <Text style={styles.sectionTitle}>Members</Text>
          {members.map((member, index) => (
            <GlassCard key={member.id} style={styles.memberCard}>
              <View style={styles.memberTop}>
                <Text style={styles.memberIndex}>Member {index + 1}</Text>
                {members.length > 2 ? (
                  <Pressable onPress={() => removeMember(member.id)}>
                    <Feather name="trash-2" size={18} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                ref={(ref) => {
                  memberNameRefs.current[member.id] = ref;
                }}
                placeholder="Name"
                placeholderTextColor={colors.muted}
                value={member.name}
                onChangeText={(text) => updateMember(member.id, { name: text })}
                onFocus={scrollToFocusedField}
                onSubmitEditing={() => focusNextMemberField(index, 'name')}
                returnKeyType="next"
                style={styles.input}
              />
              <Pressable
                onPress={() => handlePickMemberContact(member.id)}
                disabled={pickingContactMemberId === member.id}
                style={[styles.contactButton, pickingContactMemberId === member.id ? styles.contactButtonDisabled : null]}
              >
                <Feather name="book-open" size={16} color={colors.textPrimary} />
                <Text style={styles.contactButtonText}>
                  {pickingContactMemberId === member.id ? 'Opening contacts...' : 'Choose From Contacts'}
                </Text>
              </Pressable>
              <TextInput
                ref={(ref) => {
                  memberPhoneRefs.current[member.id] = ref;
                }}
                placeholder="Phone number"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                value={member.phone}
                onChangeText={(text) => updateMember(member.id, { phone: normalizePhoneInput(text) })}
                maxLength={10}
                onFocus={scrollToFocusedField}
                onSubmitEditing={() => focusNextMemberField(index, 'phone')}
                returnKeyType={index === members.length - 1 ? 'done' : 'next'}
                style={styles.input}
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Mark as you / organizer</Text>
                <Switch
                  value={member.isOrganizer}
                  onValueChange={(value) => updateMember(member.id, { isOrganizer: value })}
                  trackColor={{ true: colors.primaryStart, false: colors.white10 }}
                />
              </View>
            </GlassCard>
          ))}

          <Pressable style={styles.addMemberButton} onPress={addMember}>
            <Feather name="plus-circle" size={18} color={colors.textPrimary} />
            <Text style={styles.addMemberText}>Add Members</Text>
          </Pressable>

          <Pressable onPress={handleCreate}>
            <LinearGradient colors={gradients.primary} style={styles.createButton}>
              <Text style={styles.createText}>Create Group</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <ContactPhonePickerModal
        visible={Boolean(pendingMemberContact)}
        contactName={pendingMemberContact?.contact?.name}
        phoneOptions={pendingMemberContact?.contact?.phoneOptions}
        onClose={closePendingMemberContact}
        onSelect={(option) => {
          if (!pendingMemberContact) {
            return;
          }

          applyPickedMemberContact(pendingMemberContact.memberId, pendingMemberContact.contact, option.phone);
          closePendingMemberContact();
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingTop: 68,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 22,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactButtonDisabled: {
    opacity: 0.65,
  },
  contactButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: 8,
  },
  inputText: {
    color: colors.textPrimary,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  memberCard: {
    marginBottom: 12,
  },
  memberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  memberIndex: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  switchLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  addMemberText: {
    color: colors.textPrimary,
    marginLeft: 8,
    fontWeight: '700',
  },
  createButton: {
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
  },
  createText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
});
