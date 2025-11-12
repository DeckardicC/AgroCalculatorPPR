import Database from '../database/Database';
import SeedService from './SeedService';
import SeedEfficacyService from './SeedEfficacyService';

class DatabaseService {
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await Database.initDatabase();
      await SeedService.seedInitialData();
      await SeedEfficacyService.seedEfficacyData();
      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export default new DatabaseService();

