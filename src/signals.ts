interface Signal<T> {
  value: T;
}

class SignalImplementation<Value> implements Signal<Value> {
  protected _value: Value;
  private dependencies = new Set<Effect>();

  constructor(initialValue: Value) {
    this._value = initialValue;
  }

  get value() {
    this.addDependency();
    return this._value;
  }

  set value(newValue: Value) {
    if (Object.is(newValue, this._value)) {
      return;
    }
    this._value = newValue;
    this.runDependencies();
  }

  protected addDependency() {
    if (!executingEffect) {
      return;
    }

    this.dependencies.add(executingEffect);
    executingEffect.dependencies.push(this);
  }

  protected runDependencies() {
    const depsToRun = [...this.dependencies];
    depsToRun.forEach((effect) => effect());
  }

  removeDependency(effect: Effect) {
    this.dependencies.delete(effect);
  }
}

export function signal<Value>(initialValue: Value): Signal<Value> {
  return new SignalImplementation(initialValue);
}

interface Effect {
  (): void;
  isActive: boolean;
  isRunning: boolean;
  dependencies: SignalImplementation<unknown>[];
}

let executingEffect: Effect | null = null;

export function effect(cb: VoidFunction) {
  const effectCb: Effect = () => {
    if (effectCb.isRunning || !effectCb.isActive) {
      return;
    }

    effectCb.dependencies.forEach((signal) => signal.removeDependency(effectCb));

    effectCb.isRunning = true;
    const prevRunningEffect = executingEffect;
    executingEffect = effectCb;

    try {
      cb();
    } catch (e) {
      console.error(
        "an error happened inside effect, you code might work not as expected"
      );
      throw e;
    } finally {
      executingEffect = prevRunningEffect;
      effectCb.isRunning = false;
    }
  };

  effectCb.dependencies = [];
  effectCb.isRunning = false;
  effectCb.isActive = true;

  effectCb();

  return () => {
    effectCb.isActive = false;
    effectCb.dependencies.forEach((signal) => signal.removeDependency(effectCb));
    effectCb.dependencies.length = 0;
  };
}

interface Computed<T> {
  readonly value: T;
}

class ComputedSignalImpl<Value> extends SignalImplementation<Value> {
  private compute: () => Value;
  private isDirty = true;
  private disposeEffect: VoidFunction | null = null;

  constructor(compute: () => Value) {
    super(undefined as Value);
    this.compute = compute;
  }

  override get value() {
    if (this.isDirty) {
      this.updateValueInEffect();
    }
    this.addDependency();
    return this._value;
  }

  private updateValueInEffect() {
    this.disposeEffect = effect(() => {
      if (this.isDirty) {
        this._value = this.compute();
        this.isDirty = false;
      } else {
        this.isDirty = true;
        this.disposeEffect?.();
        this.runDependencies();
      }
    });
  }
}

export function computed<Value>(compute: () => Value): Computed<Value> {
  return new ComputedSignalImpl(compute);
}