// Builds the web bundle for Android, syncs Capacitor and assembles a debug APK
// copied to ./hamoshav-debug.apk. Needs JAVA_HOME (JDK 17) and ANDROID_HOME set.
import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
run('npx tsc --noEmit');
run('npx vite build', { env: { ...process.env, BUILD_TARGET: 'android' } });
run('npx cap sync android');
run(process.platform === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug', { cwd: 'android' });
copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', 'hamoshav-debug.apk');
console.log('APK ready: hamoshav-debug.apk');
