
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viettel.pm',
  appName: 'PM Viettel',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Cấu hình thêm plugin nếu cần (Camera, Filesystem...)
  }
};

export default config;
