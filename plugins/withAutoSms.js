const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

const SOURCE_DIR = path.join(__dirname, 'auto-sms', 'android');
const PACKAGE_IMPORT = 'import com.vasuli.app.autosms.AutoSmsPackage';
const PACKAGE_REGISTRATION = 'add(AutoSmsPackage())';

const PERMISSIONS = [
  'android.permission.SEND_SMS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.SCHEDULE_EXACT_ALARM',
];

const RECEIVERS = [
  {
    name: 'com.vasuli.app.autosms.AutoSmsReceiver',
    exported: 'false',
  },
  {
    name: 'com.vasuli.app.autosms.AutoSmsSentReceiver',
    exported: 'false',
  },
  {
    // Only protected system broadcasts are listed, so third-party apps cannot trigger it.
    name: 'com.vasuli.app.autosms.AutoSmsBootReceiver',
    exported: 'true',
    actions: [
      'android.intent.action.BOOT_COMPLETED',
      'android.intent.action.MY_PACKAGE_REPLACED',
      'android.intent.action.TIME_SET',
      'android.intent.action.TIMEZONE_CHANGED',
    ],
  },
];

const withManifest = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;

    manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
    for (const permission of PERMISSIONS) {
      const exists = manifest.manifest['uses-permission'].some((entry) => entry.$['android:name'] === permission);
      if (!exists) {
        manifest.manifest['uses-permission'].push({ $: { 'android:name': permission } });
      }
    }

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application.receiver = (application.receiver || []).filter(
      (receiver) => !RECEIVERS.some((own) => own.name === receiver.$['android:name'])
    );

    for (const receiver of RECEIVERS) {
      const entry = { $: { 'android:name': receiver.name, 'android:exported': receiver.exported } };
      if (receiver.actions) {
        entry['intent-filter'] = [
          { action: receiver.actions.map((action) => ({ $: { 'android:name': action } })) },
        ];
      }
      application.receiver.push(entry);
    }

    return mod;
  });

const withSources = (config) =>
  withDangerousMod(config, [
    'android',
    async (mod) => {
      const targetDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app/src/main/java/com/vasuli/app/autosms'
      );
      fs.mkdirSync(targetDir, { recursive: true });

      for (const file of fs.readdirSync(SOURCE_DIR)) {
        if (file.endsWith('.kt')) {
          fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(targetDir, file));
        }
      }

      return mod;
    },
  ]);

const withRegistration = (config) =>
  withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;

    if (!contents.includes(PACKAGE_IMPORT)) {
      contents = contents.replace(/(package [^\n]+\n)/, `$1\n${PACKAGE_IMPORT}`);
    }

    if (!contents.includes(PACKAGE_REGISTRATION)) {
      contents = contents.replace(
        /(PackageList\(this\)\.packages\.apply \{)/,
        `$1\n          ${PACKAGE_REGISTRATION}`
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });

module.exports = (config) => withRegistration(withSources(withManifest(config)));
