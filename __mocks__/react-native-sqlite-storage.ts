const SQLiteMock = {
  DEBUG: jest.fn(),
  enablePromise: jest.fn(),
  openDatabase: jest.fn(),
};

export default SQLiteMock;
