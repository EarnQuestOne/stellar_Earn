/**
 * Generic wrapper for lazy-loading services or heavy objects.
 * Ensures that the initialization logic only runs once when the instance is first requested.
 */
export class LazyInitializer<T> {
  private _instance: T | undefined;
  private readonly _factory: () => T;

  /**
   * @param factory A function that returns the initialized instance.
   */
  constructor(factory: () => T) {
    this._factory = factory;
  }

  /**
   * Returns the initialized instance. If it doesn't exist, it creates it using the factory.
   * This is state-safe for Node.js environments.
   */
  public getInstance(): T {
    if (this._instance === undefined) {
      // Execute the heavy initialization logic
      this._instance = this._factory();
    }
    return this._instance;
  }
}