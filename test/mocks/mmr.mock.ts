export class MmrServiceMock {
  async getMmrMap(_forceRefresh = false): Promise<Map<string, number>> {
    return new Map();
  }
}
