import { effect, signal } from "../signals";

describe("test effect", () => {
  it("should run effects when data changes", () => {
    let dependent: number | undefined;
    const s = signal(0);
    const eff = jest.fn(() => {
      dependent = s.value;
    });
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
    let dependent: number | undefined;
    const s1 = signal(1);
    const s2 = signal(1);

    effect(() => {
      dependent = s1.value + s2.value;
    });
    expect(dependent).toBe(2);

    s1.value = 7;

    expect(dependent).toBe(8);

    s2.value = 5;

    expect(dependent).toBe(12);
  });

  it("should observe function chain calls", () => {
    let dependent: number | undefined;
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

    const eff1 = jest.fn(() => {
      s1.value = s2.value;
    });
    const eff2 = jest.fn(() => {
      s2.value = s1.value;
    });
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
    let dependent: string | undefined;
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
    let dependent: number | undefined;
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