// Base Entity class for DDD
export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  constructor(id: string, props: T) {
    this._id = id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  public equals(entity?: Entity<T>): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }
    if (!(entity instanceof Entity)) {
      return false;
    }
    return this._id === entity._id;
  }
}
