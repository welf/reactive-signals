import { computed, effect, signal } from "./signals";

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
    let dependent1, dependent2;
    const s = signal(0);

    effect(() => (dependent1 = s.value));
    effect(() => (dependent2 = s.value));

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

describe("test effect", () => {
  it("should run effects when data changes", () => {
    let dependent;
    const s = signal(0);
    const eff = jest.fn(() => (dependent = s.value));

    effect(eff);

    expect(eff).toHaveBeenCalledTimes(1);
    expect(dependent).toBe(0);

    for (let i = 0; i < 10; i++) {
      s.value++;
    }

    expect(eff).toHaveBeenCalledTimes(11);
    expect(dependent).toBe(10);
  });

  it("should observe multiple signals", () => {
    let dependent;
    const s1 = signal(1);
    const s2 = signal(1);

    effect(() => (dependent = s1.value + s2.value));

    expect(dependent).toBe(2);

    s1.value = 7;

    expect(dependent).toBe(8);

    s2.value = 5;

    expect(dependent).toBe(12);
  });

  it("should observe function chain calls", () => {
    let dependent;
    const s = signal(0);

    const getComputed = () => s.value;

    effect(() => {
      dependent = getComputed();
    });

    expect(dependent).toBe(0);

    s.value = 5;

    expect(dependent).toBe(5);
  });

  it("should avoid infinite recursive loops when effect updates the signal itself", () => {
    const s = signal(0);

    const eff = jest.fn(() => s.value++);
    effect(eff);

    expect(s.value).toBe(1);
    expect(eff).toHaveBeenCalledTimes(1);

    s.value = 4;
    expect(s.value).toBe(5);
    expect(eff).toHaveBeenCalledTimes(2);
  });

  it("should avoid infinite loops with when one signal's effect updates the other signal, \
  and it triggers another effect that updates the first signal", () => {
    const s1 = signal(0);
    const s2 = signal(1);

    const eff1 = jest.fn(() => (s1.value = s2.value));
    const eff2 = jest.fn(() => (s2.value = s1.value));

    effect(eff1);
    effect(eff2);

    expect(s1.value).toBe(1);
    expect(s2.value).toBe(1);

    expect(eff1).toHaveBeenCalledTimes(1);
    expect(eff2).toHaveBeenCalledTimes(1);

    s2.value = 4;

    expect(s1.value).toBe(4);
    expect(s2.value).toBe(4);

    expect(eff1).toHaveBeenCalledTimes(2);
    expect(eff2).toHaveBeenCalledTimes(2);

    s1.value = 10;

    expect(s1.value).toBe(10);
    expect(s2.value).toBe(10);

    expect(eff1).toHaveBeenCalledTimes(3);
    expect(eff2).toHaveBeenCalledTimes(3);
  });

  it("should continue to add dependencies after recursion", () => {
    const s1 = signal(0);
    const s2 = signal(1);
    const s3 = signal(0);

    const eff1 = jest.fn(() => {
      s1.value = s2.value * 2;
    });
    const eff2 = jest.fn(() => {
      s2.value = s1.value * 2;
      s3.value;
    });

    effect(eff1);
    effect(eff2);

    expect(s1.value).toBe(8);
    expect(s2.value).toBe(4);

    expect(eff1).toHaveBeenCalledTimes(2);
    expect(eff2).toHaveBeenCalledTimes(1);

    s3.value = 10;

    expect(eff1).toHaveBeenCalledTimes(3);
    expect(eff2).toHaveBeenCalledTimes(2);
  });

  it("should execute correctly if effect is conditional and the condition depends on signal", () => {
    const s1 = signal(0);
    const s2 = signal(0);

    const eff1 = jest.fn();
    const eff2 = jest.fn();

    effect(() => {
      if (s1.value < 2) {
        eff1();
      } else if (s2.value >= 0) {
        eff2();
      }
    });

    expect(eff1).toHaveBeenCalledTimes(1);
    expect(eff2).toHaveBeenCalledTimes(0);

    s1.value = 2;

    expect(eff1).toHaveBeenCalledTimes(1);
    expect(eff2).toHaveBeenCalledTimes(1);

    s2.value = 5;

    expect(eff1).toHaveBeenCalledTimes(1);
    expect(eff2).toHaveBeenCalledTimes(2);
  });

  it("should execute correctly if effect is conditional", () => {
    let dependent;
    const boolSignal = signal(true);
    const stringSignal = signal("value");

    const conditionalEffect = jest.fn(() => {
      dependent = boolSignal.value ? stringSignal.value : "other";
    });
    effect(conditionalEffect);

    expect(dependent).toBe("value");
    expect(conditionalEffect).toHaveBeenCalledTimes(1);

    boolSignal.value = false;
    expect(dependent).toBe("other");
    expect(conditionalEffect).toHaveBeenCalledTimes(2);

    stringSignal.value = "value2";
    expect(dependent).toBe("other");
    expect(conditionalEffect).toHaveBeenCalledTimes(2);
  });

  it("should not run if the new value is the same as the old value", () => {
    let dependent;
    const s = signal(0);

    const eff = jest.fn(() => {
      dependent = s.value;
    });
    effect(eff);

    expect(dependent).toBe(0);
    expect(eff).toHaveBeenCalledTimes(1);

    s.value = 2;

    expect(dependent).toBe(2);
    expect(eff).toHaveBeenCalledTimes(2);

    s.value = 2;

    expect(dependent).toBe(2);
    expect(eff).toHaveBeenCalledTimes(2);
  });
});

describe("test computed", () => {
  it("should return updated value", () => {
    const s = signal(0);
    const computedValue = computed(() => s.value);
    expect(computedValue.value).toBe(0);
    s.value = 1;
    expect(computedValue.value).toBe(1);
  });

  it("should be lazy evaluated", () => {
    const s = signal(10);
    const eff = jest.fn(() => s.value);
    const computedValue = computed(eff);

    // computedValue is never read and the eff was never called (lazy evaluation)
    expect(eff).not.toHaveBeenCalled();

    expect(computedValue.value).toBe(10);
    expect(eff).toHaveBeenCalledTimes(1);

    // should not be computed again
    computedValue.value;
    expect(eff).toHaveBeenCalledTimes(1);

    // we don't read the computedValue and it is not recomputed
    s.value = 11;
    expect(eff).toHaveBeenCalledTimes(1);

    // we read the computedValue and it is recomputed
    expect(computedValue.value).toBe(11);
    expect(eff).toHaveBeenCalledTimes(2);

    // should not be computed again
    computedValue.value;
    expect(eff).toHaveBeenCalledTimes(2);
  });

  it("should trigger effect", () => {
    const s = signal(10);
    const computedValue = computed(() => {
      return s.value;
    });
    let dependent;
    effect(() => {
      dependent = computedValue.value;
    });
    expect(dependent).toBe(10);
    s.value = 11;
    expect(dependent).toBe(11);
  });

  it("should work when depends on another computed value", () => {
    const s = signal(0);

    const computedValue1 = computed(() => s.value);
    const computedValue2 = computed(() => computedValue1.value + 1);

    expect(computedValue1.value).toBe(0);
    expect(computedValue2.value).toBe(1);

    s.value += 1;
    expect(computedValue1.value).toBe(1);
    expect(computedValue2.value).toBe(2);
  });

  it("should trigger effect when depends on another computed value", () => {
    const s = signal(0);

    const eff1 = jest.fn(() => s.value);
    const eff2 = jest.fn(() => computedValue1.value + 1);

    const computedValue1 = computed(eff1);
    const computedValue2 = computed(eff2);

    let dependent;
    effect(() => {
      dependent = computedValue2.value;
    });
    expect(dependent).toBe(1);
    expect(eff1).toHaveBeenCalledTimes(1);
    expect(eff2).toHaveBeenCalledTimes(1);

    s.value += 1;
    expect(dependent).toBe(2);

    // should not result in duplicate calls
    expect(eff1).toHaveBeenCalledTimes(2);
    expect(eff2).toHaveBeenCalledTimes(2);
  });

  it("should trigger effect excessively when depends on another computed value", () => {
    const s = signal(0);

    const eff1 = jest.fn(() => s.value);
    const eff2 = jest.fn(() => computedValue1.value + 1);

    const computedValue1 = computed(eff1);
    const computedValue2 = computed(eff2);

    let dependent;
    effect(() => {
      dependent = computedValue1.value + computedValue2.value;
    });
    expect(dependent).toBe(1);

    expect(eff1).toHaveBeenCalledTimes(1);
    expect(eff2).toHaveBeenCalledTimes(1);

    s.value += 1;
    expect(dependent).toBe(3);

    // should not result in duplicate calls
    expect(eff1).toHaveBeenCalledTimes(2);
    expect(eff2).toHaveBeenCalledTimes(2);
  });
});
