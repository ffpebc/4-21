import React, { useState, useEffect, useRef } from 'react';
import {
  TrainerState,
  encodeBackupCode,
  decodeBackupCode,
} from '../utils/trainerLogic';
import {
  pushStateToCloudPin,
  pullStateFromCloudPin,
  mergeTrainerStates,
  cloudSyncManager,
} from '../utils/storageSync';
import { SwipeableSheet } from './LiquidGlassControls';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: TrainerState;
  onRestoreState: (newState: TrainerState) => void;
}

export const SyncModal: React.FC<SyncModalProps> = React.memo(({
  isOpen,
  onClose,
  state,
  onRestoreState,
}) => {
  const [pinInput, setPinInput] = useState(state.profilePin || '');
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    'Автосохранение на сервере и в браузере активно'
  );
  const [statusTone, setStatusTone] = useState<'ok' | 'warn'>('ok');
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setPinInput(state.profilePin || '');
      setBackupCodeInput(encodeBackupCode(state));
      setStatusMessage(
        state.profilePin
          ? `🟢 Профиль «${state.profilePin}» синхронизируется на лету`
          : 'Автосохранение активно (Сервер + Браузер)'
      );
      setStatusTone('ok');
    }
  }, [isOpen, state]);

  // Subscribe to real-time status updates from cloud sync manager
  useEffect(() => {
    return cloudSyncManager.subscribeStatus((status) => {
      if (status.message) {
        setStatusMessage(status.message);
        setStatusTone(status.state === 'error' ? 'warn' : 'ok');
      }
    });
  }, []);

  const triggerAutoSyncPin = (rawPin: string) => {
    const cleanPin = rawPin.trim().toUpperCase().replace(/[^A-ZА-ЯЁ0-9_-]/g, '').slice(0, 32);
    if (cleanPin.length >= 2) {
      cloudSyncManager.setPin(cleanPin, state);
      if (cleanPin !== state.profilePin) {
        onRestoreState({ ...state, profilePin: cleanPin });
      }
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setPinInput(val);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      triggerAutoSyncPin(val);
    }, 400);
  };

  const handleSavePin = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const cleanPin = pinInput
      .trim()
      .toUpperCase()
      .replace(/[^A-ZА-ЯЁ0-9_-]/g, '')
      .slice(0, 32);
    if (cleanPin.length < 2) {
      setStatusTone('warn');
      setStatusMessage('Введите минимум 2 символа для кода профиля');
      return;
    }

    const updatedState: TrainerState = { ...state, profilePin: cleanPin };
    onRestoreState(updatedState);
    cloudSyncManager.setPin(cleanPin, updatedState);
    cloudSyncManager.notifyStateChanged(updatedState, true);

    const existing = await pullStateFromCloudPin(cleanPin);
    if (existing.found && existing.state) {
      const merged = mergeTrainerStates(updatedState, existing.state, { incomingIsNewer: true });
      onRestoreState(merged);
      cloudSyncManager.notifyStateChanged(merged, true);
      setStatusTone('ok');
      setStatusMessage(
        `🟢 Профиль «${cleanPin}» подключён! Объединено решённых: ${merged.totalSolved}`
      );
      return;
    }

    const res = await pushStateToCloudPin(cleanPin, updatedState);
    if (res.ok) {
      setStatusTone('ok');
      setStatusMessage(`🟢 Профиль «${cleanPin}» сохранён на сервере. Синхронизация активна!`);
    } else {
      setStatusTone('ok');
      setStatusMessage(`Профиль «${cleanPin}» сохранён в памяти устройства`);
    }
  };

  const handlePullFromPin = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const cleanPin = pinInput
      .trim()
      .toUpperCase()
      .replace(/[^A-ZА-ЯЁ0-9_-]/g, '')
      .slice(0, 32);
    const targetPin = cleanPin.length >= 2 ? cleanPin : state.profilePin;
    if (!targetPin || targetPin.length < 2) {
      setStatusTone('warn');
      setStatusMessage('Укажите код профиля для загрузки');
      return;
    }
    const res = await pullStateFromCloudPin(targetPin);
    if (res.found && res.state) {
      const merged = mergeTrainerStates(state, res.state, { incomingIsNewer: true });
      onRestoreState(merged);
      cloudSyncManager.setPin(targetPin, merged);
      setBackupCodeInput(encodeBackupCode(merged));
      setStatusTone('ok');
      setStatusMessage(
        `🟢 Прогресс «${targetPin}» загружен (${merged.totalSolved} решённых)!`
      );
    } else {
      setStatusTone('warn');
      setStatusMessage(
        targetPin
          ? `Профиль «${targetPin}» не найден на сервере`
          : 'На сервере пока нет сохранённого профиля'
      );
    }
  };

  const handleCopyBackupCode = async () => {
    const code = encodeBackupCode(state);
    setBackupCodeInput(code);
    try {
      await navigator.clipboard.writeText(code);
      setStatusTone('ok');
      setStatusMessage('Резервный код скопирован в буфер обмена!');
    } catch {
      setStatusTone('ok');
      setStatusMessage('Код обновлён ниже — скопируйте его');
    }
  };

  const handleApplyBackupCode = () => {
    const restored = decodeBackupCode(backupCodeInput, state);
    if (!restored) {
      setStatusTone('warn');
      setStatusMessage('Неверный формат кода (нужен EGE27-...)');
      return;
    }
    onRestoreState(restored);
    setStatusTone('ok');
    setStatusMessage(
      `Восстановлено! Решено: ${restored.totalSolved}, Ошибок: ${restored.errorBank.length}`
    );
  };

  return (
    <SwipeableSheet
      id="sync-modal"
      handleId="sync-drag-handle"
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Память и синхронизация прогресса"
      handleAriaLabel="Потяните вниз, чтобы закрыть окно памяти"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5 shrink-0">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-[18px] font-extrabold tracking-tight leading-tight whitespace-nowrap truncate">
            Память и синхронизация
          </h3>
          <span
            id="sync-status-sub"
            className="block text-[11.5px] font-semibold truncate whitespace-nowrap mt-0.5"
            style={{
              color: statusTone === 'ok' ? 'var(--ios-green)' : 'var(--ios-orange)',
            }}
          >
            {statusMessage}
          </span>
        </div>
        <button
          id="close-sync-modal"
          type="button"
          onClick={onClose}
          className="liquid-pill-btn px-3.5 py-1.5 rounded-full text-[13.5px] font-bold cursor-pointer shrink-0"
        >
          Готово
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain no-scrollbar p-0.5 -m-0.5">
        {/* 1. Hosted Cloud Sync (Default + Multi-Device PIN) */}
        <div className="ios-inset-group p-3.5 !mb-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-[13px] font-bold whitespace-nowrap truncate">
              1. Облачная память сервера
            </div>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
              style={{ background: 'var(--ios-green-soft)', color: 'var(--ios-green)' }}
            >
              Активно
            </span>
          </div>
          <p className="text-[12px] mb-2" style={{ color: 'var(--ios-label-sec)' }}>
            Прогресс автоматически синхронизируется между ПК и телефоном на лету. Введите ваш
            общий код профиля (например, <strong>FFPEBC</strong> или <strong>ALEX77</strong>),
            и все задания мгновенно отобразятся на обоих устройствах.
          </p>
          <input
            id="profile-pin-input"
            type="text"
            maxLength={20}
            value={pinInput}
            onChange={handlePinChange}
            onBlur={handleSavePin}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
                handleSavePin();
              }
            }}
            placeholder="Код профиля (напр. FFPEBC или ALEX77)"
            aria-label="Ваш личный пин-код или ник"
            className="w-full px-3 py-2 rounded-xl text-[16px] font-bold placeholder:font-medium outline-none mb-2"
            style={{
              background: 'var(--ios-bg-secondary)',
              border: '0.5px solid var(--ios-separator)',
              color: 'var(--ios-label)',
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              id="save-profile-pin-btn"
              type="button"
              onClick={handleSavePin}
              className="ios-btn-tinted !min-h-[38px] !px-2.5 !text-[12px] w-full"
            >
              Сохранить на сервере
            </button>
            <button
              id="load-profile-pin-btn"
              type="button"
              onClick={handlePullFromPin}
              className="ios-btn-tinted !min-h-[38px] !px-2.5 !text-[12px] w-full"
              style={{ background: 'var(--ios-green-soft)', color: 'var(--ios-green)' }}
            >
              Загрузить с сервера
            </button>
          </div>
        </div>

        {/* 2. Instant 1-Tap Backup Code */}
        <div className="ios-inset-group p-3.5 !mb-0">
          <div className="text-[13px] font-bold mb-1">
            2. Резервный код прогресса (автономная копия)
          </div>
          <p className="text-[12px] mb-2" style={{ color: 'var(--ios-label-sec)' }}>
            Компактный код содержит всю статистику, рекорды, журнал занятий и Банк ошибок.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              id="copy-backup-code-btn"
              type="button"
              onClick={handleCopyBackupCode}
              className="ios-btn-tinted !min-h-[38px] !px-2.5 !text-[12px] w-full"
            >
              Скопировать код
            </button>
            <button
              id="apply-backup-code-btn"
              type="button"
              onClick={handleApplyBackupCode}
              className="ios-btn-tinted !min-h-[38px] !px-2.5 !text-[12px] w-full"
              style={{ background: 'var(--ios-green-soft)', color: 'var(--ios-green)' }}
            >
              Восстановить код
            </button>
          </div>
          <input
            id="backup-code-input"
            type="text"
            value={backupCodeInput}
            onChange={(e) => setBackupCodeInput(e.target.value)}
            placeholder="Вставьте сюда код EGE27-... для восстановления"
            aria-label="Резервный код прогресса"
            className="w-full px-3 py-2 rounded-xl text-[16px] font-mono outline-none"
            style={{
              background: 'var(--ios-bg-secondary)',
              border: '0.5px solid var(--ios-separator)',
              color: 'var(--ios-label)',
            }}
          />
        </div>
      </div>
    </SwipeableSheet>
  );
});
