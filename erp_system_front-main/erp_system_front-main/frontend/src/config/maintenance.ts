interface MaintenanceConfig {
  isMaintenanceMode: boolean;
  maintenanceStart?: string;
  maintenanceEnd?: string;
}

const maintenanceConfig: MaintenanceConfig = {
  isMaintenanceMode: true, // Set to false to disable maintenance mode
  maintenanceStart: '10:00', // Optional: Start time of maintenance
  maintenanceEnd: '14:00', // Optional: End time of maintenance
};

export default maintenanceConfig;