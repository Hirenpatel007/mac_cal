import {
  calculatorReducer,
  groupDisplayValue,
  INITIAL_CALCULATOR_STATE,
  type CalculatorAction,
  type CalculatorState,
} from './engine';

function press(state: CalculatorState, ...actions: CalculatorAction[]): CalculatorState {
  return actions.reduce(calculatorReducer, state);
}

describe('calculatorReducer', () => {
  it('evaluates chained arithmetic in the same order as a handheld calculator', () => {
    const result = press(
      INITIAL_CALCULATOR_STATE,
      { type: 'digit', digit: '8' },
      { type: 'operator', operator: '÷' },
      { type: 'digit', digit: '2' },
      { type: 'operator', operator: '+' },
      { type: 'digit', digit: '3' },
      { type: 'equals' },
    );

    expect(result.display).toBe('7');
    expect(result.expression).toBe('4 + 3 =');
    expect(result.history[0]).toMatchObject({ expression: '4 + 3', result: '7' });
  });

  it('repeats the last operation when equals is pressed again', () => {
    const firstResult = press(
      INITIAL_CALCULATOR_STATE,
      { type: 'digit', digit: '1' },
      { type: 'digit', digit: '2' },
      { type: 'operator', operator: '+' },
      { type: 'digit', digit: '3' },
      { type: 'equals' },
    );
    const secondResult = calculatorReducer(firstResult, { type: 'equals' });

    expect(firstResult.display).toBe('15');
    expect(secondResult.display).toBe('18');
    expect(secondResult.expression).toBe('15 + 3 =');
  });

  it('applies a percent relative to the pending add/subtract value', () => {
    const result = press(
      INITIAL_CALCULATOR_STATE,
      { type: 'digit', digit: '2' },
      { type: 'digit', digit: '0' },
      { type: 'digit', digit: '0' },
      { type: 'operator', operator: '+' },
      { type: 'digit', digit: '1' },
      { type: 'digit', digit: '0' },
      { type: 'percent' },
      { type: 'equals' },
    );

    expect(result.display).toBe('220');
  });

  it('shows a recoverable error on division by zero', () => {
    const error = press(
      INITIAL_CALCULATOR_STATE,
      { type: 'digit', digit: '9' },
      { type: 'operator', operator: '÷' },
      { type: 'digit', digit: '0' },
      { type: 'equals' },
    );
    const recovered = calculatorReducer(error, { type: 'digit', digit: '4' });

    expect(error.display).toBe('Error');
    expect(recovered.display).toBe('4');
    expect(recovered.operator).toBeNull();
  });

  it('supports degree-mode scientific functions and remembers completed work', () => {
    const result = press(
      INITIAL_CALCULATOR_STATE,
      { type: 'digit', digit: '9' },
      { type: 'digit', digit: '0' },
      { type: 'unary', operation: 'sin' },
    );

    expect(result.display).toBe('1');
    expect(result.history[0]).toMatchObject({ expression: 'sin(90)', result: '1' });
  });

  it('stores, recalls, and clears the memory register', () => {
    const recalled = press(
      INITIAL_CALCULATOR_STATE,
      { type: 'digit', digit: '4' },
      { type: 'digit', digit: '2' },
      { type: 'memory', operation: 'add' },
      { type: 'clear' },
      { type: 'memory', operation: 'recall' },
    );
    const cleared = calculatorReducer(recalled, { type: 'memory', operation: 'clear' });

    expect(recalled.display).toBe('42');
    expect(recalled.memoryValue).toBe(42);
    expect(cleared.memoryValue).toBe(0);
  });

  it('groups digits without changing the decimal entry', () => {
    expect(groupDisplayValue('1234567.80')).toBe('1,234,567.80');
    expect(groupDisplayValue('-4200')).toBe('−4,200');
    expect(groupDisplayValue('1.2e+21')).toBe('1.2e+21');
  });
});
