import SQLite from 'react-native-sqlite-storage';

// Enable promise-based API
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DATABASE_NAME = 'AgroCalculatorPPR.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAY_NAME = 'AgroCalculator PPR Database';
const DATABASE_SIZE = 200000;

class Database {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<SQLite.SQLiteDatabase> {
    try {
      this.db = await SQLite.openDatabase({
        name: DATABASE_NAME,
        version: DATABASE_VERSION,
        displayName: DATABASE_DISPLAY_NAME,
        size: DATABASE_SIZE,
        location: 'default',
      });

      await this.createTables();
      return this.db;
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Crops table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS crops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_en TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        variety TEXT,
        bbh_min INTEGER,
        bbh_max INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Pests table (weeds, diseases, insects)
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS pests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_en TEXT,
        type TEXT NOT NULL,
        category TEXT,
        description TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Products table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_en TEXT,
        active_ingredient TEXT,
        concentration TEXT,
        type TEXT NOT NULL,
        category TEXT,
        manufacturer TEXT,
        price_per_unit REAL,
        unit TEXT,
        min_dosage REAL,
        max_dosage REAL,
        unit_dosage TEXT,
        waiting_period INTEGER,
        efficacy_data TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Product efficacy against pests
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS product_pest_efficacy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        pest_id INTEGER NOT NULL,
        efficacy_percent REAL,
        crop_id INTEGER,
        phase_min INTEGER,
        phase_max INTEGER,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (pest_id) REFERENCES pests(id),
        FOREIGN KEY (crop_id) REFERENCES crops(id)
      );
    `);

    // Product crop compatibility
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS product_crop_compatibility (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        crop_id INTEGER NOT NULL,
        phase_min INTEGER,
        phase_max INTEGER,
        notes TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (crop_id) REFERENCES crops(id)
      );
    `);

    // Product compatibility matrix
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS product_compatibility (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id_1 INTEGER NOT NULL,
        product_id_2 INTEGER NOT NULL,
        chemical_compatible INTEGER DEFAULT 1,
        physical_compatible INTEGER DEFAULT 1,
        biological_compatible INTEGER DEFAULT 1,
        notes TEXT,
        FOREIGN KEY (product_id_1) REFERENCES products(id),
        FOREIGN KEY (product_id_2) REFERENCES products(id)
      );
    `);

    // Fields table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        area REAL NOT NULL,
        soil_type TEXT,
        latitude REAL,
        longitude REAL,
        description TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Field crop history (rotation)
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS field_crop_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_id INTEGER NOT NULL,
        crop_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        season TEXT,
        area REAL,
        FOREIGN KEY (field_id) REFERENCES fields(id),
        FOREIGN KEY (crop_id) REFERENCES crops(id)
      );
    `);

    // Treatments table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS treatments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_id INTEGER NOT NULL,
        crop_id INTEGER NOT NULL,
        treatment_date INTEGER NOT NULL,
        area REAL NOT NULL,
        weather_temperature REAL,
        weather_humidity REAL,
        weather_wind_speed REAL,
        operator_name TEXT,
        equipment_type TEXT,
        total_cost REAL,
        notes TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (field_id) REFERENCES fields(id),
        FOREIGN KEY (crop_id) REFERENCES crops(id)
      );
    `);

    // Treatment products
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS treatment_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        treatment_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        dosage REAL NOT NULL,
        working_solution_volume REAL,
        cost REAL,
        FOREIGN KEY (treatment_id) REFERENCES treatments(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);

    // Warehouse inventory
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS warehouse_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT,
        purchase_date INTEGER,
        expiration_date INTEGER,
        purchase_price REAL,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);

    // Treatment planning table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS treatment_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_id INTEGER NOT NULL,
        crop_id INTEGER,
        planned_date INTEGER NOT NULL,
        window_start INTEGER,
        window_end INTEGER,
        status TEXT DEFAULT 'planned',
        priority INTEGER DEFAULT 2,
        reason TEXT,
        recommended_products TEXT,
        warehouse_status TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (field_id) REFERENCES fields(id),
        FOREIGN KEY (crop_id) REFERENCES crops(id)
      );
    `);

    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS resistance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_id INTEGER NOT NULL,
        active_ingredient TEXT NOT NULL,
        usage_count INTEGER NOT NULL,
        last_treatment_date INTEGER,
        risk_level TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (field_id) REFERENCES fields(id)
      );
    `);

    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        units TEXT DEFAULT 'metric',
        language TEXT DEFAULT 'ru',
        default_area REAL,
        default_sprayer_capacity REAL,
        notifications_enabled INTEGER DEFAULT 1,
        reminders_enabled INTEGER DEFAULT 1,
        auto_backup_enabled INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    await this.db.executeSql(`
      INSERT OR IGNORE INTO user_settings (id, units, language, default_area, default_sprayer_capacity, notifications_enabled, reminders_enabled, auto_backup_enabled)
      VALUES (1, 'metric', 'ru', 50, 300, 1, 1, 1);
    `);

    // Create indexes for better performance
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);`);
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_pests_type ON pests(type);`);
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_crops_category ON crops(category);`);
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_treatments_date ON treatments(treatment_date);`);
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_field_crop_history_field ON field_crop_history(field_id);`);
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_treatment_plans_date ON treatment_plans(planned_date);`);
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans(status);`);
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_resistance_field ON resistance_records(field_id);`);
    await this.db.executeSql(
      `CREATE INDEX IF NOT EXISTS idx_resistance_active ON resistance_records(active_ingredient);`,
    );
    await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_user_settings_singleton ON user_settings(id);`);
  }

  getDatabase(): SQLite.SQLiteDatabase | null {
    return this.db;
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export default new Database();

