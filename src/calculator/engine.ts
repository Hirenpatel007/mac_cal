export type Operator = '+' | '-' | '×' | '÷' | '^';
export type AngleMode = 'DEG' | 'RAD';
export type UnaryOperation =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'ln'
  | 'log'
  | 'square'
  | 'sqrt'
  | 'reciprocal'
  | 'pi';
export type MemoryOperation = 'clear' | 'recall' | 'add' | 'subtract';

export interface Calculation {
  id: string;
  expression: string;
  result: string;
}

export interface CalculatorState {
  display: string;
  storedValue: number | null;
  operator: Operator | null;
  waitingForOperand: boolean;
  expression: string;
  lastOperator: Operator | null;
  lastOperand: number | null;
  history: Calculation[];
  memoryValue: number;
  angleMode: AngleMode;
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: Operator }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'delete' }
  | { type: 'sign' }
  | { type: 'percent' }
  | { type: 'unary'; operation: UnaryOperation }
  | { type: 'memory'; operation: MemoryOperation }
  | { type: 'toggle-angle' }
  | { type: 'clear-history' }
  | { type: 'select-history'; entryId: string };

export const INITIAL_CALCULATOR_STATE: CalculatorState = {
  display: '0',
  storedValue: null,
  operator: null,
  waitingForOperand: false,
  expression: '',
  lastOperator: null,
  lastOperand: null,
  history: [],
  memoryValue: 0,
  angleMode: 'DEG',
};

const MAX_ENTRY_LENGTH = 15;
const MAX_HISTORY_ITEMS = 30;

export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return 'Error';

  const cleaned = Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(12));
  return Object.is(cleaned, -0) ? '0' : String(cleaned);
}

export function groupDisplayValue(value: string): string {
  if (value === 'Error' || /e[+-]?\d+$/i.test(value)) return value;

  const isNegative = value.startsWith('-');
  const unsigned = isNegative ? value.slice(1) : value;
  const [whole, fraction] = unsigned.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = isNegative ? '−' : '';
  return `${sign}${grouped}${fraction === undefined ? '' : `.${fraction}`}`;
}

function parseDisplay(display: string): number | null {
  if (display === 'Error') return null;
  const value = Number(display);
  return Number.isFinite(value) ? value : null;
}

function operatorSymbol(operator: Operator): string {
  return operator === '-' ? '−' : operator === '^' ? 'xʸ' : operator;
}

function calculate(left: number, operator: Operator, right: number): number | null {
  let result: number;
  switch (operator) {
    case '+':
      result = left + right;
      break;
    case '-':
      result = left - right;
      break;
    case '×':
      result = left * right;
      break;
    case '÷':
      if (right === 0) return null;
      result = left / right;
      break;
    case '^':
      result = left ** right;
      break;
  }

  return Number.isFinite(result) ? result : null;
}

function addHistory(
  history: Calculation[],
  expression: string,
  result: string,
): Calculation[] {
  const entry: Calculation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expression,
    result,
  };
  return [entry, ...history].slice(0, MAX_HISTORY_ITEMS);
}

function errorState(state: CalculatorState, message = 'Error'): CalculatorState {
  return {
    ...state,
    display: 'Error',
    expression: message,
    storedValue: null,
    operator: null,
    waitingForOperand: true,
    lastOperator: null,
    lastOperand: null,
  };
}

function cleanEntry(state: CalculatorState): CalculatorState {
  if (state.display !== '0' && !state.waitingForOperand) {
    const hasPendingOperation = state.operator !== null;
    return {
      ...state,
      display: '0',
      waitingForOperand: hasPendingOperation,
      expression: hasPendingOperation ? state.expression : '',
      lastOperator: hasPendingOperation ? state.lastOperator : null,
      lastOperand: hasPendingOperation ? state.lastOperand : null,
    };
  }

  return {
    ...state,
    display: '0',
    storedValue: null,
    operator: null,
    waitingForOperand: false,
    expression: '',
    lastOperator: null,
    lastOperand: null,
  };
}

function applyUnary(value: number, operation: UnaryOperation, angleMode: AngleMode): number | null {
  let result: number;
  const radians = angleMode === 'DEG' ? (value * Math.PI) / 180 : value;

  switch (operation) {
    case 'sin':
      result = Math.sin(radians);
      break;
    case 'cos':
      result = Math.cos(radians);
      break;
    case 'tan':
      if (Math.abs(Math.cos(radians)) < 1e-12) return null;
      result = Math.tan(radians);
      break;
    case 'ln':
      if (value <= 0) return null;
      result = Math.log(value);
      break;
    case 'log':
      if (value <= 0) return null;
      result = Math.log10(value);
      break;
    case 'square':
      result = value * value;
      break;
    case 'sqrt':
      if (value < 0) return null;
      result = Math.sqrt(value);
      break;
    case 'reciprocal':
      if (value === 0) return null;
      result = 1 / value;
      break;
    case 'pi':
      result = Math.PI;
      break;
  }

  return Number.isFinite(result) ? result : null;
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'digit': {
      if (!/^\d$/.test(action.digit)) return state;
      const isError = state.display === 'Error';
      const startsNewEntry = state.waitingForOperand || isError;
      let display: string;

      if (startsNewEntry) {
        display = action.digit;
      } else if (state.display === '0') {
        display = action.digit;
      } else if (state.display.replace(/\D/g, '').length < MAX_ENTRY_LENGTH) {
        display = `${state.display}${action.digit}`;
      } else {
        return state;
      }

      return {
        ...state,
        display,
        storedValue: isError ? null : state.storedValue,
        operator: isError ? null : state.operator,
        waitingForOperand: false,
        expression: isError || state.operator === null ? '' : state.expression,
        lastOperator: null,
        lastOperand: null,
      };
    }

    case 'decimal': {
      const isError = state.display === 'Error';
      const startsNewEntry = state.waitingForOperand || isError;
      const display = startsNewEntry
        ? '0.'
        : state.display.includes('.')
          ? state.display
          : `${state.display}.`;

      return {
        ...state,
        display,
        storedValue: isError ? null : state.storedValue,
        operator: isError ? null : state.operator,
        waitingForOperand: false,
        expression: isError || state.operator === null ? '' : state.expression,
        lastOperator: null,
        lastOperand: null,
      };
    }

    case 'operator': {
      const currentValue = parseDisplay(state.display);
      if (currentValue === null) return state;

      if (state.operator && state.storedValue !== null && !state.waitingForOperand) {
        const result = calculate(state.storedValue, state.operator, currentValue);
        if (result === null) return errorState(state, 'Cannot divide by zero');
        const resultText = formatResult(result);
        return {
          ...state,
          display: resultText,
          storedValue: result,
          operator: action.operator,
          waitingForOperand: true,
          expression: `${resultText} ${operatorSymbol(action.operator)}`,
          lastOperator: null,
          lastOperand: null,
        };
      }

      const storedValue = state.operator && state.storedValue !== null
        ? state.storedValue
        : currentValue;
      const storedText = formatResult(storedValue);

      return {
        ...state,
        storedValue,
        operator: action.operator,
        waitingForOperand: true,
        expression: `${storedText} ${operatorSymbol(action.operator)}`,
        lastOperator: null,
        lastOperand: null,
      };
    }

    case 'equals': {
      const currentValue = parseDisplay(state.display);
      if (currentValue === null) return state;

      if (state.operator && state.storedValue !== null) {
        const rightValue = state.waitingForOperand ? state.storedValue : currentValue;
        const result = calculate(state.storedValue, state.operator, rightValue);
        if (result === null) return errorState(state, 'Cannot divide by zero');

        const leftText = formatResult(state.storedValue);
        const rightText = formatResult(rightValue);
        const resultText = formatResult(result);
        const expression = `${leftText} ${operatorSymbol(state.operator)} ${rightText}`;

        return {
          ...state,
          display: resultText,
          storedValue: null,
          operator: null,
          waitingForOperand: true,
          expression: `${expression} =`,
          lastOperator: state.operator,
          lastOperand: rightValue,
          history: addHistory(state.history, expression, resultText),
        };
      }

      if (state.lastOperator && state.lastOperand !== null) {
        const result = calculate(currentValue, state.lastOperator, state.lastOperand);
        if (result === null) return errorState(state, 'Cannot divide by zero');

        const leftText = formatResult(currentValue);
        const rightText = formatResult(state.lastOperand);
        const resultText = formatResult(result);
        const expression = `${leftText} ${operatorSymbol(state.lastOperator)} ${rightText}`;

        return {
          ...state,
          display: resultText,
          waitingForOperand: true,
          expression: `${expression} =`,
          history: addHistory(state.history, expression, resultText),
        };
      }

      return state;
    }

    case 'clear':
      return cleanEntry(state);

    case 'delete': {
      if (state.waitingForOperand || state.display === 'Error') return state;
      const display = state.display.length <= 1 || state.display.length === 2 && state.display.startsWith('-')
        ? '0'
        : state.display.slice(0, -1);
      return { ...state, display, lastOperator: null, lastOperand: null };
    }

    case 'sign': {
      if (state.display === 'Error' || Number(state.display) === 0) return state;
      const display = state.display.startsWith('-')
        ? state.display.slice(1)
        : `-${state.display}`;
      return { ...state, display, waitingForOperand: false };
    }

    case 'percent': {
      const currentValue = parseDisplay(state.display);
      if (currentValue === null) return state;

      const isAdditive = state.operator === '+' || state.operator === '-';
      const percentValue = isAdditive && state.storedValue !== null
        ? (state.storedValue * currentValue) / 100
        : currentValue / 100;
      const display = formatResult(percentValue);
      return {
        ...state,
        display,
        waitingForOperand: false,
        lastOperator: null,
        lastOperand: null,
      };
    }

    case 'unary': {
      const currentValue = parseDisplay(state.display);
      if (currentValue === null) return state;
      const result = applyUnary(currentValue, action.operation, state.angleMode);
      if (result === null) return errorState(state, 'That operation is not defined');

      const resultText = formatResult(result);
      if (action.operation === 'pi') {
        return {
          ...state,
          display: resultText,
          waitingForOperand: state.operator === null,
          expression: state.operator === null ? '' : state.expression,
          lastOperator: null,
          lastOperand: null,
        };
      }

      if (state.operator) {
        return {
          ...state,
          display: resultText,
          waitingForOperand: false,
          lastOperator: null,
          lastOperand: null,
        };
      }

      const functionName: Record<Exclude<UnaryOperation, 'pi'>, string> = {
        sin: 'sin',
        cos: 'cos',
        tan: 'tan',
        ln: 'ln',
        log: 'log',
        square: 'square',
        sqrt: '√',
        reciprocal: '1 ÷',
      };
      const expression = `${functionName[action.operation]}(${formatResult(currentValue)})`;
      return {
        ...state,
        display: resultText,
        storedValue: null,
        operator: null,
        waitingForOperand: true,
        expression: `${expression} =`,
        lastOperator: null,
        lastOperand: null,
        history: addHistory(state.history, expression, resultText),
      };
    }

    case 'memory': {
      if (action.operation === 'clear') return { ...state, memoryValue: 0 };
      if (action.operation === 'recall') {
        return {
          ...state,
          display: formatResult(state.memoryValue),
          waitingForOperand: state.operator === null,
          expression: state.operator === null ? '' : state.expression,
          lastOperator: null,
          lastOperand: null,
        };
      }

      const value = parseDisplay(state.display);
      if (value === null) return state;
      const memoryValue = action.operation === 'add'
        ? state.memoryValue + value
        : state.memoryValue - value;
      return {
        ...state,
        memoryValue: Number.isFinite(memoryValue) ? memoryValue : 0,
      };
    }

    case 'toggle-angle':
      return { ...state, angleMode: state.angleMode === 'DEG' ? 'RAD' : 'DEG' };

    case 'clear-history':
      return { ...state, history: [] };

    case 'select-history': {
      const entry = state.history.find(item => item.id === action.entryId);
      if (!entry) return state;
      return {
        ...state,
        display: entry.result,
        storedValue: null,
        operator: null,
        waitingForOperand: true,
        expression: `${entry.expression} =`,
        lastOperator: null,
        lastOperand: null,
      };
    }
  }
}
