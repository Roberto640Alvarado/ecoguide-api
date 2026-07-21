export const flashCardsRepositoryMock = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findAll: jest.fn(),
  countByAreaAndType: jest.fn().mockResolvedValue(0),
};
