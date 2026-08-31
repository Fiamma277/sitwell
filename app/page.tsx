'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  Bell,
  Check,
  Footprints,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TimerMode = 'standard' | 'focus' | 'custom';
type TimerPhase = 'sit' | 'move';
type Guide = 'male' | 'female';

const CLAUDE_MARK_PATH =
  'm4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z';

const modeDetails: Record<
  Exclude<TimerMode, 'custom'>,
  { label: string; description: string; sit: number; move: number }
> = {
  standard: { label: '标准模式', description: '科学节奏', sit: 30, move: 5 },
  focus: { label: '专注模式', description: '少些打断', sit: 40, move: 5 },
};

const guideCopy: Record<Guide, string> = {
  male:
    '像忍住排气与排尿，感受肛周内收、阴茎根部略回缩、阴囊轻提；放松时完全松开。',
  female:
    '像忍住排气与排尿，轻轻闭合肛门、阴道与尿道周围，并向内、向上提；放松时完全回落。',
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function ClaudeMark({ active }: { active: boolean }) {
  return (
    <svg
      aria-label="盆底肌收紧与放松节奏图标"
      className={`breathing-mark ${active ? 'is-active' : ''}`}
      role="img"
      viewBox="0 0 24 24"
    >
      <path d={CLAUDE_MARK_PATH} fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const [mode, setMode] = useState<TimerMode>('standard');
  const [phase, setPhase] = useState<TimerPhase>('sit');
  const [customSit, setCustomSit] = useState(35);
  const [customMove, setCustomMove] = useState(5);
  const [remaining, setRemaining] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<
    NotificationPermission | 'unsupported'
  >('default');
  const [guide, setGuide] = useState<Guide>('male');
  const [trainingActive, setTrainingActive] = useState(false);
  const [trainingSeconds, setTrainingSeconds] = useState(0);
  const [completedBreaks, setCompletedBreaks] = useState(0);
  const [completedTraining, setCompletedTraining] = useState(0);
  const [breakAlertOpen, setBreakAlertOpen] = useState(false);

  const durations = useMemo(() => {
    if (mode === 'custom') return { sit: customSit, move: customMove };
    return { sit: modeDetails[mode].sit, move: modeDetails[mode].move };
  }, [customMove, customSit, mode]);

  const currentTotal = durations[phase] * 60;
  const progress = Math.max(0, Math.min(1, 1 - remaining / currentTotal));
  const trainingPhase = trainingSeconds % 6 < 3 ? 'contract' : 'relax';
  const trainingCountdown = 3 - (trainingSeconds % 3);
  const trainingRound = Math.min(8, Math.floor(trainingSeconds / 6) + 1);

  useEffect(() => {
    if ('Notification' in window) setNotificationStatus(Notification.permission);
    else setNotificationStatus('unsupported');

    const saved = window.localStorage.getItem(`sitwell-stats-${todayKey()}`);
    if (saved) {
      try {
        const stats = JSON.parse(saved) as { breaks?: number; training?: number };
        setCompletedBreaks(stats.breaks ?? 0);
        setCompletedTraining(stats.training ?? 0);
      } catch {
        window.localStorage.removeItem(`sitwell-stats-${todayKey()}`);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      `sitwell-stats-${todayKey()}`,
      JSON.stringify({ breaks: completedBreaks, training: completedTraining }),
    );
  }, [completedBreaks, completedTraining]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((previous) => {
        if (previous > 1) return previous - 1;
        const nextPhase: TimerPhase = phase === 'sit' ? 'move' : 'sit';
        setPhase(nextPhase);
        if (phase === 'sit') {
          setCompletedBreaks((value) => value + 1);
          setBreakAlertOpen(true);
        }
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(
            nextPhase === 'move' ? '该起来活动一下啦' : '活动完成，继续安心专注',
            {
              body:
                nextPhase === 'move'
                  ? `轻走或舒展 ${durations.move} 分钟，别只站在原地。`
                  : `下一段久坐计时为 ${durations.sit} 分钟。`,
            },
          );
        }
        return durations[nextPhase] * 60;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [durations, phase, running]);

  useEffect(() => {
    if (!trainingActive) return;
    const timer = window.setInterval(() => {
      setTrainingSeconds((previous) => {
        if (previous >= 47) {
          setTrainingActive(false);
          setCompletedTraining((value) => value + 1);
          return 48;
        }
        return previous + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [trainingActive]);

  function selectMode(nextMode: TimerMode) {
    setMode(nextMode);
    setPhase('sit');
    setRunning(false);
    const nextMinutes = nextMode === 'custom' ? customSit : modeDetails[nextMode].sit;
    setRemaining(nextMinutes * 60);
  }

  function updateCustom(kind: 'sit' | 'move', value: number) {
    const safeValue = Math.max(1, Math.min(kind === 'sit' ? 120 : 30, value));
    if (kind === 'sit') {
      setCustomSit(safeValue);
      if (phase === 'sit') setRemaining(safeValue * 60);
    } else {
      setCustomMove(safeValue);
      if (phase === 'move') setRemaining(safeValue * 60);
    }
    setRunning(false);
  }

  function resetTimer() {
    setRunning(false);
    setRemaining(durations[phase] * 60);
  }

  function skipPhase() {
    const nextPhase: TimerPhase = phase === 'sit' ? 'move' : 'sit';
    setPhase(nextPhase);
    setRemaining(durations[nextPhase] * 60);
  }

  async function enableNotifications() {
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
      return;
    }
    setNotificationStatus(await Notification.requestPermission());
  }

  function toggleTraining() {
    if (trainingActive) {
      setTrainingActive(false);
      setTrainingSeconds(0);
      return;
    }
    setTrainingSeconds(0);
    setTrainingActive(true);
  }

  function snoozeBreak() {
    setBreakAlertOpen(false);
    setPhase('sit');
    setRemaining(5 * 60);
    setRunning(true);
  }

  const phaseTitle =
    phase === 'sit' ? '安心专注，到了我们叫你' : '起身走一走，身体会谢谢你';
  const notificationLabel =
    notificationStatus === 'granted'
      ? '提醒已开启'
      : notificationStatus === 'denied' || notificationStatus === 'unsupported'
        ? '站内提醒已开启'
          : '开启提醒';

  return (
    <main className="site-shell">
      <header className="topbar">
        <a aria-label="SitWell 首页" className="brand" href="#top">
          <span className="brand-dot">S</span>
          <span>SitWell</span>
        </a>
        <div className="topbar-meta">
          <span className="today-copy">今天已起身 {completedBreaks} 次</span>
          <Button
            aria-label={notificationLabel}
            className="notification-button"
            disabled={notificationStatus === 'denied' || notificationStatus === 'unsupported'}
            onClick={enableNotifications}
            size="lg"
            variant="outline"
          >
            {notificationStatus === 'granted' ? <Check /> : <Bell />}
            {notificationLabel}
          </Button>
        </div>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">久坐健康助手</p>
        <h1>坐一会，也要动一动。</h1>
        <p>让专注有节奏，让身体有喘息。</p>
      </section>

      <section className="product-grid">
        <div className="timer-column">
          <article className={`timer-card ${phase === 'move' ? 'is-moving' : ''}`}>
          <div className="card-heading">
            <div className="card-icon">{phase === 'sit' ? <Armchair /> : <Footprints />}</div>
            <div><p>{phase === 'sit' ? '久坐计时' : '活动时间'}</p><h2>{phaseTitle}</h2></div>
          </div>

          <div
            aria-label={`${phase === 'sit' ? '久坐' : '活动'}剩余 ${formatTime(remaining)}`}
            className="timer-ring"
            role="timer"
            style={{ '--timer-progress': `${progress * 360}deg` } as React.CSSProperties}
          >
            <div className="timer-face">
              <span>{phase === 'sit' ? '距离起身还有' : '轻走或舒展'}</span>
              <strong>{formatTime(remaining)}</strong>
              <small>{phase === 'sit' ? `${durations.sit} 分钟专注` : `${durations.move} 分钟活动`}</small>
            </div>
          </div>

          <div className="timer-actions">
            <Button className="primary-action" onClick={() => setRunning((value) => !value)} size="lg">
              {running ? <Pause /> : <Play />}{running ? '暂停' : remaining === currentTotal ? '开始计时' : '继续'}
            </Button>
            <Button aria-label="重置当前计时" onClick={resetTimer} size="icon-lg" variant="outline"><RotateCcw /></Button>
            <Button aria-label="跳到下一阶段" onClick={skipPhase} size="icon-lg" variant="outline"><SkipForward /></Button>
          </div>

          <p className="timer-footnote">
            {phase === 'sit'
              ? '计时结束后，尽量轻走、接水或舒展，而不只是站在原地。'
              : '慢慢活动即可，不需要剧烈运动。完成后会自动开始下一轮。'}
          </p>
          </article>

          <section aria-label="计时模式" className="mode-switcher">
            <button aria-pressed={mode === 'standard'} className="mode-option" onClick={() => selectMode('standard')} type="button">
              <span><strong>标准模式</strong><small>科学节奏</small></span><b>30 + 5</b>
            </button>
            <button aria-pressed={mode === 'focus'} className="mode-option" onClick={() => selectMode('focus')} type="button">
              <span><strong>专注模式</strong><small>少些打断</small></span><b>40 + 5</b>
            </button>
            <button aria-pressed={mode === 'custom'} className="mode-option" onClick={() => selectMode('custom')} type="button">
              <span><strong>自定义</strong><small>按你的节奏</small></span><b>{customSit} + {customMove}</b>
            </button>
          </section>

          {mode === 'custom' && (
            <section aria-label="自定义计时时长" className="custom-settings">
              <label>
                久坐分钟
                <Input max={120} min={1} onChange={(event) => updateCustom('sit', Number(event.target.value) || 1)} type="number" value={customSit} />
              </label>
              <span>+</span>
              <label>
                活动分钟
                <Input max={30} min={1} onChange={(event) => updateCustom('move', Number(event.target.value) || 1)} type="number" value={customMove} />
              </label>
            </section>
          )}
        </div>

        <article className="training-card">
          <div className="training-topline"><span>盆底肌训练</span><span>今日 {completedTraining} 组</span></div>
          <h2>跟着图标，收紧与放松</h2>
          <p className="training-subtitle">3 秒收紧 · 3 秒放松 · 共 8 轮</p>

          <div className={`training-stage ${trainingPhase}`}>
            <div className="mark-halo"><ClaudeMark active={trainingActive} /></div>
            <div aria-live="polite" className="training-cue">
              {trainingSeconds >= 48 ? (
                <><strong>本组完成</strong><span>让盆底自然放松一会</span></>
              ) : trainingActive ? (
                <><strong>{trainingPhase === 'contract' ? '收紧并向上提' : '完全放松'}</strong><span>{trainingCountdown} · 第 {trainingRound}/8 轮</span></>
              ) : (
                <><strong>准备好了吗？</strong><span>一组不到 1 分钟</span></>
              )}
            </div>
          </div>

          <div aria-label="选择身体引导" className="guide-switcher">
            <button aria-pressed={guide === 'male'} onClick={() => setGuide('male')} type="button">男性引导</button>
            <button aria-pressed={guide === 'female'} onClick={() => setGuide('female')} type="button">女性引导</button>
          </div>
          <p className="guide-copy">{guideCopy[guide]}</p>

          <Button className="training-button" onClick={toggleTraining} size="lg">
            {trainingActive ? <Pause /> : <Play />}
            {trainingActive ? '结束训练' : trainingSeconds >= 48 ? '再练一组' : '开始 1 分钟训练'}
          </Button>

          <div className="safety-note">
            <strong>动作提示</strong>
            <p>保持呼吸，不要夹紧臀部或大腿。收缩后要完全放松，不要向下用力。</p>
            <p>如有盆腔或肛周疼痛、排尿排便困难，请暂停并咨询专业人士。</p>
          </div>
        </article>
      </section>

      {breakAlertOpen && (
        <div className="movement-alert-overlay" role="presentation">
          <section
            aria-describedby="movement-alert-description"
            aria-labelledby="movement-alert-title"
            aria-modal="true"
            className="movement-alert"
            role="alertdialog"
          >
            <div className="movement-alert-icon"><Footprints /></div>
            <div>
              <h2 id="movement-alert-title">该起来活动一下啦</h2>
              <p id="movement-alert-description">
                轻走、接杯水或舒展 {durations.move} 分钟。活动比只站在原地更有帮助。
              </p>
            </div>
            <div className="movement-alert-actions">
              <Button onClick={snoozeBreak} variant="outline">延后 5 分钟</Button>
              <Button onClick={() => setBreakAlertOpen(false)}>现在起身</Button>
            </div>
          </section>
        </div>
      )}

      <footer><span>SitWell MVP</span><p>轻量提醒工具，不替代医疗诊断或个体化盆底康复方案。</p></footer>
    </main>
  );
}
