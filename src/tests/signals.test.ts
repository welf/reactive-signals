import { effect, signal } from "../signals";

describe("test signals", () => {
  it('should initialize with the provided initial value', () => {
    const initialValue = 10;
    const s = signal(initialValue);
    expect(s.value).toBe(initialValue);
  });

  it('should return the current value when accessed', () => {
    const s = signal(42);
    expect(s.value).toBe(42);
  });

  it('should not trigger dependencies when setting the same value', () => {
    const initialValue = 10;
    const s = signal(initialValue);
    const effectMock = jest.fn();
    effect(effectMock);

    s.value = initialValue;

    expect(effectMock).toHaveBeenCalledTimes(1);
  });

  it("should update the signal's value when setting a new value", () => {
    const s = signal(5);
    const newValue = 10;
    s.value = newValue;
    expect(s.value).toBe(newValue);
  });

  it('should trigger dependent effects when setting a new value', () => {
    const s = signal(0);
    let effect1Triggered = false;
    let effect2Triggered = false;

    const effect1 = effect(() => {
      effect1Triggered = true;
    });

    const effect2 = effect(() => {
      effect2Triggered = true;
    });

    s.value = 1;

    expect(effect1Triggered).toBe(true);
    expect(effect2Triggered).toBe(true);

    effect1();
    effect2();
  });

  it('should add dependencies when getting value during effect execution', () => {
    const s = signal(5);
    let effectRan = false;
    effect(() => {
      effectRan = true;
      expect(s.value).toBe(5);
    })();
    expect(effectRan).toBe(true);
  });

  it('should remove dependencies when effect is deactivated', () => {
    const s = signal(5);
    let effectRan = false;
    const eff = effect(() => {
      effectRan = true;
    });
    s.value = 10;
    expect(effectRan).toBe(true);

    eff();
    effectRan = false;
    s.value = 15;
    expect(effectRan).toBe(false);
  });

  it("should handle multiple effects", () => {
    let dependent1: number | undefined;
    let dependent2: number | undefined;
    const s = signal(0);

    effect(() => {
      dependent1 = s.value;
    });

    effect(() => {
      dependent2 = s.value;
    });

    expect(dependent1).toBe(0);
    expect(dependent2).toBe(0);

    s.value = 7;

    expect(dependent1).toBe(7);
    expect(dependent2).toBe(7);
  });

  it('should run effects in the order they were added', () => {
    const s = signal(0);
    let order = '';

    effect(() => {
      order += 'A';
      expect(order).toBe('A');
    });

    effect(() => {
      order += 'B';
      expect(order).toBe('AB');
    });

    effect(() => {
      order += 'C';
      expect(order).toBe('ABC');
    });

    s.value = 1;
  });
});
