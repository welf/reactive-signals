import { computed, effect, signal } from "../signals";

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
    let dependent: number | undefined;
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

    let dependent: number | undefined;
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

    let dependent: number | undefined;
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