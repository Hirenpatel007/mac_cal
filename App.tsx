import React, { useCallback, useReducer, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  calculatorReducer,
  groupDisplayValue,
  INITIAL_CALCULATOR_STATE,
  type CalculatorAction,
  type CalculatorState,
  type Calculation,
  type MemoryOperation,
  type Operator,
} from './src/calculator/engine';

type Mode = 'basic' | 'scientific';
type KeyVariant = 'number' | 'utility' | 'operator' | 'equals' | 'scientific';

type MacKeyEvent = {
  nativeEvent: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
  };
  preventDefault: () => void;
};

type KeyboardViewProps = React.ComponentProps<typeof View> & {
  focusable?: boolean;
  keyDownEvents?: Array<{ key: string; shiftKey?: boolean }>;
  onKeyDown?: (event: MacKeyEvent) => void;
};

// `onKeyDown` and `keyDownEvents` are supplied by React Native for macOS.
// Keep the app's regular React Native types portable while enabling desktop keys.
const KeyboardView = View as unknown as React.ComponentType<KeyboardViewProps>;

const KEYBOARD_EVENTS = [
  ...'0123456789.+-*/%=,'.split('').map(key => ({ key })),
  ...['+', '*', '%', '^', '='].map(key => ({ key, shiftKey: true })),
  ...['Enter', 'Backspace', 'Delete', 'Escape'].map(key => ({ key })),
];

interface KeySpec {
  label: string;
  action: CalculatorAction;
  variant?: KeyVariant;
  wide?: boolean;
  compact?: boolean;
  active?: boolean;
  accessibilityLabel?: string;
}

interface CalculatorKeyProps extends Omit<KeySpec, 'action'> {
  onPress: () => void;
}

function CalculatorKey({
  label,
  variant = 'number',
  wide = false,
  compact = false,
  active = false,
  accessibilityLabel,
  onPress,
}: CalculatorKeyProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        variant === 'utility' && styles.utilityKey,
        variant === 'operator' && styles.operatorKey,
        variant === 'equals' && styles.equalsKey,
        variant === 'scientific' && styles.scientificKey,
        wide && styles.wideKey,
        compact && styles.compactKey,
        active && styles.activeOperatorKey,
        pressed && styles.keyPressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.keyLabel,
          variant === 'utility' && styles.utilityLabel,
          variant === 'operator' && styles.operatorLabel,
          variant === 'equals' && styles.equalsLabel,
          variant === 'scientific' && styles.scientificLabel,
          compact && styles.compactLabel,
          wide && styles.wideLabel,
          active && styles.activeOperatorLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        active && styles.modeButtonActive,
        pressed && styles.modeButtonPressed,
      ]}
    >
      <Text style={[styles.modeButtonLabel, active && styles.modeButtonLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MemoryControl({
  label,
  operation,
  disabled,
  dispatch,
}: {
  label: string;
  operation: MemoryOperation;
  disabled?: boolean;
  dispatch: React.Dispatch<CalculatorAction>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === 'M+' ? 'Add display to memory' : label === 'M−' ? 'Subtract display from memory' : `${label} memory`}
      disabled={disabled}
      onPress={() => dispatch({ type: 'memory', operation })}
      style={({ pressed }) => [
        styles.memoryControl,
        disabled && styles.disabledButton,
        pressed && styles.memoryControlPressed,
      ]}
    >
      <Text style={styles.memoryControlLabel}>{label}</Text>
    </Pressable>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function HistoryView({
  history,
  onClear,
  onSelect,
}: {
  history: Calculation[];
  onClear: () => void;
  onSelect: (entry: Calculation) => void;
}) {
  return (
    <View style={styles.historyView}>
      <View style={styles.historyHeading}>
        <View>
          <Text style={styles.sectionEyebrow}>YOUR WORK</Text>
          <Text style={styles.historyTitle}>Recent calculations</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear calculation history"
          disabled={history.length === 0}
          onPress={onClear}
          style={({ pressed }) => [
            styles.clearHistoryButton,
            history.length === 0 && styles.disabledButton,
            pressed && styles.keyPressed,
          ]}
        >
          <Text style={styles.clearHistoryLabel}>CLEAR ALL</Text>
        </Pressable>
      </View>

      {history.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
        >
          {history.map(entry => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`${entry.expression} equals ${entry.result}`}
              onPress={() => onSelect(entry)}
              style={({ pressed }) => [
                styles.historyItem,
                pressed && styles.historyItemPressed,
              ]}
            >
              <View style={styles.historyItemCopy}>
                <Text style={styles.historyExpression} numberOfLines={1}>
                  {entry.expression} =
                </Text>
                <Text style={styles.historyTime}>{formatTime(Number(entry.id.split('-')[0]))}</Text>
              </View>
              <Text style={styles.historyResult} numberOfLines={1}>
                {groupDisplayValue(entry.result)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyHistory}>
          <View style={styles.emptyHistoryIcon}>
            <Text style={styles.emptyHistoryGlyph}>↺</Text>
          </View>
          <Text style={styles.emptyHistoryTitle}>Nothing here yet</Text>
          <Text style={styles.emptyHistoryCopy}>
            Finished calculations will be saved here for quick reference.
          </Text>
        </View>
      )}
    </View>
  );
}

function getOperatorForKey(label: string): Operator | null {
  switch (label) {
    case '+':
      return '+';
    case '−':
      return '-';
    case '×':
      return '×';
    case '÷':
      return '÷';
    case 'xʸ':
      return '^';
    default:
      return null;
  }
}

function Calculator({
  state,
  dispatch,
  mode,
}: {
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
  mode: Mode;
}) {
  const clearLabel = state.display !== '0' && !state.waitingForOperand ? 'C' : 'AC';
  const makeOperatorKey = (label: string): KeySpec => {
    const operator = getOperatorForKey(label);
    if (!operator) throw new Error(`Unknown calculator operator: ${label}`);
    return {
      label,
      variant: 'operator',
      active: state.operator === operator,
      action: { type: 'operator', operator },
    };
  };

  const basicRows: KeySpec[][] = [
    [
      {
        label: clearLabel,
        variant: 'utility',
        accessibilityLabel: clearLabel === 'AC' ? 'All clear' : 'Clear entry',
        action: { type: 'clear' },
      },
      { label: '±', variant: 'utility', action: { type: 'sign' }, accessibilityLabel: 'Change sign' },
      { label: '%', variant: 'utility', action: { type: 'percent' }, accessibilityLabel: 'Percent' },
      makeOperatorKey('÷'),
    ],
    [
      ...['7', '8', '9'].map(digit => ({
        label: digit,
        action: { type: 'digit', digit } as CalculatorAction,
      })),
      makeOperatorKey('×'),
    ],
    [
      ...['4', '5', '6'].map(digit => ({
        label: digit,
        action: { type: 'digit', digit } as CalculatorAction,
      })),
      makeOperatorKey('−'),
    ],
    [
      ...['1', '2', '3'].map(digit => ({
        label: digit,
        action: { type: 'digit', digit } as CalculatorAction,
      })),
      makeOperatorKey('+'),
    ],
    [
      {
        label: '0',
        wide: true,
        action: { type: 'digit', digit: '0' },
      },
      { label: '.', action: { type: 'decimal' }, accessibilityLabel: 'Decimal point' },
      {
        label: '=',
        variant: 'equals',
        action: { type: 'equals' },
        accessibilityLabel: 'Equals',
      },
    ],
  ];

  const scientificRows: KeySpec[][] = [
    [
      { label: 'sin', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'sin' } },
      { label: 'cos', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'cos' } },
      { label: 'tan', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'tan' } },
      { label: 'ln', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'ln' } },
      { label: 'log', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'log' } },
    ],
    [
      { label: 'x²', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'square' } },
      { label: '√x', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'sqrt' } },
      { label: '1/x', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'reciprocal' } },
      makeOperatorKey('xʸ'),
      { label: 'π', variant: 'scientific', compact: true, action: { type: 'unary', operation: 'pi' } },
    ],
  ];

  const rows = mode === 'scientific'
    ? [...scientificRows, ...basicRows]
    : basicRows;

  return (
    <>
      <View style={styles.displayCard}>
        <View style={styles.displayTopline}>
          <View style={styles.displayLabelGroup}>
            <View style={styles.liveDot} />
            <Text style={styles.displayLabel}>DISPLAY</Text>
          </View>
          {state.memoryValue !== 0 ? (
            <View style={styles.memoryBadge}>
              <Text style={styles.memoryBadgeLabel}>M</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.expressionText} numberOfLines={1}>
          {state.expression || 'Ready when you are'}
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          numberOfLines={1}
          style={[
            styles.displayValue,
            state.display === 'Error' && styles.errorValue,
            state.display.length > 12 && styles.longDisplayValue,
          ]}
        >
          {groupDisplayValue(state.display)}
        </Text>
      </View>

      <View style={styles.memoryBar}>
        <Text style={styles.memoryBarLabel}>MEMORY</Text>
        <View style={styles.memoryControls}>
          <MemoryControl label="MC" operation="clear" disabled={state.memoryValue === 0} dispatch={dispatch} />
          <MemoryControl label="MR" operation="recall" disabled={state.memoryValue === 0} dispatch={dispatch} />
          <MemoryControl label="M−" operation="subtract" dispatch={dispatch} />
          <MemoryControl label="M+" operation="add" dispatch={dispatch} />
        </View>
      </View>

      {mode === 'scientific' ? (
        <View style={styles.scientificCaption}>
          <Text style={styles.scientificCaptionText}>SCIENTIFIC FUNCTIONS</Text>
                <Text style={styles.scientificCaptionHint}>Enter a value, then choose a function</Text>
        </View>
      ) : null}

      <View style={[styles.keypad, mode === 'scientific' && styles.scientificKeypad]}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keyRow}>
            {row.map((key, keyIndex) => (
              <CalculatorKey
                key={`${rowIndex}-${keyIndex}-${key.label}`}
                {...key}
                onPress={() => dispatch(key.action)}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerKeyboard}>⌨ KEYBOARD</Text>
        <Text style={styles.footerShortcuts}>0–9&nbsp;&nbsp; + − × ÷&nbsp;&nbsp; ↵</Text>
      </View>
    </>
  );
}

function App() {
  const [state, dispatch] = useReducer(calculatorReducer, INITIAL_CALCULATOR_STATE);
  const [mode, setMode] = useState<Mode>('basic');
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleKeyDown = useCallback((event: MacKeyEvent) => {
    const { key, metaKey, ctrlKey, altKey } = event.nativeEvent;
    if (metaKey || ctrlKey || altKey) return;

    if (historyOpen) {
      if (key === 'Escape') {
        setHistoryOpen(false);
        event.preventDefault();
      }
      return;
    }

    let action: CalculatorAction | null = null;
    if (/^\d$/.test(key)) {
      action = { type: 'digit', digit: key };
    } else if (key === '.' || key === ',') {
      action = { type: 'decimal' };
    } else if (key === '+' || key === '-') {
      action = { type: 'operator', operator: key };
    } else if (key === '*' || key === '×') {
      action = { type: 'operator', operator: '×' };
    } else if (key === '/' || key === '÷') {
      action = { type: 'operator', operator: '÷' };
    } else if (key === '^') {
      action = { type: 'operator', operator: '^' };
    } else if (key === '%') {
      action = { type: 'percent' };
    } else if (key === '=' || key === 'Enter' || key === 'Return') {
      action = { type: 'equals' };
    } else if (key === 'Backspace' || key === 'Delete') {
      action = { type: 'delete' };
    } else if (key === 'Escape') {
      action = { type: 'clear' };
    }

    if (action) {
      dispatch(action);
      event.preventDefault();
    }
  }, [dispatch, historyOpen]);

  const handleHistorySelect = (entry: Calculation) => {
    dispatch({ type: 'select-history', entryId: entry.id });
    setHistoryOpen(false);
  };

  return (
    <KeyboardView
      focusable
      keyDownEvents={KEYBOARD_EVENTS}
      onKeyDown={handleKeyDown}
      style={styles.root}
    >
      <StatusBar hidden />
      <View style={styles.appShell}>
        <View style={styles.topBar}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkGlyph}>∑</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>MacCal</Text>
            <Text style={styles.brandTagline}>A LITTLE MORE PRECISE</Text>
          </View>
          <View style={styles.topBarSpacer} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={historyOpen ? 'Back to calculator' : 'Open calculation history'}
            onPress={() => setHistoryOpen(open => !open)}
            style={({ pressed }) => [styles.historyToggle, pressed && styles.historyTogglePressed]}
          >
            <Text style={styles.historyToggleGlyph}>{historyOpen ? '‹' : '↺'}</Text>
            <Text style={styles.historyToggleLabel}>{historyOpen ? 'CALCULATOR' : 'HISTORY'}</Text>
          </Pressable>
        </View>

        {historyOpen ? (
          <HistoryView
            history={state.history}
            onClear={() => dispatch({ type: 'clear-history' })}
            onSelect={handleHistorySelect}
          />
        ) : (
          <View style={styles.calculatorView}>
            <View style={styles.controlRow}>
              <View style={styles.modeSwitch}>
                <ModeButton
                  label="Basic"
                  active={mode === 'basic'}
                  onPress={() => setMode('basic')}
                />
                <ModeButton
                  label="Scientific"
                  active={mode === 'scientific'}
                  onPress={() => setMode('scientific')}
                />
              </View>
              {mode === 'scientific' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Angle mode ${state.angleMode}. Change angle mode.`}
                  onPress={() => dispatch({ type: 'toggle-angle' })}
                  style={({ pressed }) => [styles.angleModeButton, pressed && styles.keyPressed]}
                >
                  <Text style={styles.angleModeLabel}>{state.angleMode}</Text>
                  <Text style={styles.angleModeChevron}>⌄</Text>
                </Pressable>
              ) : (
                <Text style={styles.controlHint}>BUILT FOR MAC</Text>
              )}
            </View>

            <Calculator state={state} dispatch={dispatch} mode={mode} />
          </View>
        )}
      </View>
    </KeyboardView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111318',
  },
  appShell: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#111318',
  },
  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252a32',
    borderWidth: 1,
    borderColor: '#343a45',
    marginRight: 10,
  },
  brandMarkGlyph: {
    color: '#f1a35e',
    fontFamily: 'Avenir Next',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  brandCopy: {
    justifyContent: 'center',
    gap: 1,
  },
  brandName: {
    color: '#f5f6f8',
    fontFamily: 'Avenir Next',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  brandTagline: {
    color: '#747d89',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.15,
  },
  topBarSpacer: {
    flex: 1,
  },
  historyToggle: {
    minWidth: 92,
    height: 34,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 11,
    backgroundColor: '#1b1f26',
    borderWidth: 1,
    borderColor: '#2a2f38',
  },
  historyTogglePressed: {
    backgroundColor: '#272d36',
  },
  historyToggleGlyph: {
    color: '#f1a35e',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  historyToggleLabel: {
    color: '#adb4bf',
    fontFamily: 'Avenir Next',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  calculatorView: {
    flex: 1,
  },
  controlRow: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  modeSwitch: {
    height: 34,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: '#191c22',
    borderWidth: 1,
    borderColor: '#292d35',
  },
  modeButton: {
    height: 26,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#303640',
  },
  modeButtonPressed: {
    opacity: 0.75,
  },
  modeButtonLabel: {
    color: '#7f8895',
    fontFamily: 'Avenir Next',
    fontSize: 11,
    fontWeight: '600',
  },
  modeButtonLabelActive: {
    color: '#f2f4f7',
  },
  controlHint: {
    color: '#626b77',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  angleModeButton: {
    height: 30,
    minWidth: 60,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 9,
    backgroundColor: '#1c2027',
    borderWidth: 1,
    borderColor: '#2a3039',
  },
  angleModeLabel: {
    color: '#c1c7d0',
    fontFamily: 'Avenir Next',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  angleModeChevron: {
    color: '#f1a35e',
    fontSize: 11,
    lineHeight: 14,
  },
  displayCard: {
    height: 132,
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 13,
    marginBottom: 13,
    borderRadius: 18,
    backgroundColor: '#191c22',
    borderWidth: 1,
    borderColor: '#292e37',
    justifyContent: 'space-between',
  },
  displayTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 14,
  },
  displayLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f1a35e',
  },
  displayLabel: {
    color: '#727b88',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.35,
  },
  memoryBadge: {
    width: 19,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: '#29241f',
  },
  memoryBadgeLabel: {
    color: '#f1a35e',
    fontFamily: 'Avenir Next',
    fontSize: 9,
    fontWeight: '800',
  },
  expressionText: {
    color: '#838c99',
    fontFamily: 'Avenir Next',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    minHeight: 17,
    marginTop: 4,
  },
  displayValue: {
    color: '#f5f6f8',
    fontFamily: 'Avenir Next',
    fontSize: 60,
    fontWeight: '300',
    lineHeight: 68,
    textAlign: 'right',
    letterSpacing: -1.4,
    includeFontPadding: false,
  },
  longDisplayValue: {
    fontSize: 45,
  },
  errorValue: {
    color: '#f18b82',
    fontSize: 48,
  },
  keypad: {
    flex: 1,
    minHeight: 0,
    gap: 9,
  },
  scientificKeypad: {
    gap: 8,
  },
  keyRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    gap: 9,
  },
  key: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    maxHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#282d35',
    borderWidth: 1,
    borderColor: '#343a45',
  },
  utilityKey: {
    backgroundColor: '#363b45',
    borderColor: '#414752',
  },
  operatorKey: {
    backgroundColor: '#df9453',
    borderColor: '#e6a16a',
  },
  equalsKey: {
    backgroundColor: '#f0a260',
    borderColor: '#f2b077',
  },
  scientificKey: {
    backgroundColor: '#20252d',
    borderColor: '#303641',
  },
  wideKey: {
    flex: 2,
    alignItems: 'flex-start',
    paddingLeft: 24,
  },
  compactKey: {
    borderRadius: 12,
  },
  activeOperatorKey: {
    backgroundColor: '#f5eee6',
    borderColor: '#fff8f0',
  },
  keyPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  keyLabel: {
    color: '#f4f5f7',
    fontFamily: 'Avenir Next',
    fontSize: 23,
    fontWeight: '500',
    lineHeight: 29,
  },
  utilityLabel: {
    color: '#eff1f4',
    fontSize: 17,
    fontWeight: '600',
  },
  operatorLabel: {
    color: '#251d17',
    fontSize: 25,
    fontWeight: '600',
  },
  equalsLabel: {
    color: '#291e16',
    fontSize: 26,
    fontWeight: '600',
  },
  scientificLabel: {
    color: '#bac2cc',
    fontFamily: 'Avenir Next',
    fontSize: 14,
    fontWeight: '600',
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  wideLabel: {
    fontSize: 23,
  },
  activeOperatorLabel: {
    color: '#bb7236',
  },
  memoryBar: {
    height: 26,
    marginBottom: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoryBarLabel: {
    color: '#69727f',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.05,
  },
  memoryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memoryControl: {
    minWidth: 36,
    height: 23,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#1d2128',
    borderWidth: 1,
    borderColor: '#2d333c',
  },
  memoryControlPressed: {
    backgroundColor: '#2a3039',
  },
  memoryControlLabel: {
    color: '#939ca8',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  scientificCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -2,
    marginBottom: 7,
    paddingHorizontal: 2,
  },
  scientificCaptionText: {
    color: '#68717e',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  scientificCaptionHint: {
    color: '#5d6672',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '500',
  },
  footer: {
    height: 18,
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerKeyboard: {
    color: '#606975',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerShortcuts: {
    color: '#747d89',
    fontFamily: 'Avenir Next',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  historyView: {
    flex: 1,
    paddingTop: 6,
  },
  historyHeading: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: '#77808d',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.25,
    marginBottom: 4,
  },
  historyTitle: {
    color: '#eff1f5',
    fontFamily: 'Avenir Next',
    fontSize: 18,
    fontWeight: '600',
  },
  clearHistoryButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#20242b',
    borderWidth: 1,
    borderColor: '#303641',
  },
  disabledButton: {
    opacity: 0.35,
  },
  clearHistoryLabel: {
    color: '#a0a8b3',
    fontFamily: 'Avenir Next',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  historyList: {
    gap: 9,
    paddingBottom: 16,
  },
  historyItem: {
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#1a1e25',
    borderWidth: 1,
    borderColor: '#2a3039',
  },
  historyItemPressed: {
    backgroundColor: '#262c35',
  },
  historyItemCopy: {
    flex: 1,
    gap: 5,
  },
  historyExpression: {
    color: '#c2c8d0',
    fontFamily: 'Avenir Next',
    fontSize: 12,
    fontWeight: '500',
  },
  historyTime: {
    color: '#66707d',
    fontFamily: 'Avenir Next',
    fontSize: 9,
  },
  historyResult: {
    color: '#f1a35e',
    fontFamily: 'Avenir Next',
    fontSize: 19,
    fontWeight: '600',
    maxWidth: 135,
  },
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 55,
  },
  emptyHistoryIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#20242c',
    borderWidth: 1,
    borderColor: '#303641',
    marginBottom: 16,
  },
  emptyHistoryGlyph: {
    color: '#f1a35e',
    fontSize: 28,
    lineHeight: 34,
  },
  emptyHistoryTitle: {
    color: '#e8ebef',
    fontFamily: 'Avenir Next',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyHistoryCopy: {
    maxWidth: 240,
    color: '#78818e',
    fontFamily: 'Avenir Next',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
});

export default App;
