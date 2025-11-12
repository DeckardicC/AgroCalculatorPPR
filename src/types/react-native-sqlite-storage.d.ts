declare module 'react-native-sqlite-storage' {
  export interface SQLiteDatabase {
    executeSql(sql: string, params?: any[]): Promise<[SQLiteResultSet]>;
    close(): Promise<void>;
  }

  export interface SQLiteResultSet {
    insertId: number;
    rowsAffected: number;
    rows: SQLiteRows;
  }

  export interface SQLiteRows {
    length: number;
    item(index: number): any;
  }

  export interface SQLiteDatabaseParams {
    name: string;
    version?: string;
    displayName?: string;
    size?: number;
    location?: string;
  }

  export interface SQLiteStatic {
    openDatabase(params: SQLiteDatabaseParams): Promise<SQLiteDatabase>;
    DEBUG(enable: boolean): void;
    enablePromise(enable: boolean): void;
  }

  const SQLite: SQLiteStatic;
  export default SQLite;
}

