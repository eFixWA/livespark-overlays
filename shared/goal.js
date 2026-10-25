// Goal bar overlay (likes or gift diamonds). The page sets data-kind on <body>.
(function () {
  const kind = document.body.dataset.kind === 'gift' ? 'gift' : 'like';
  const root = document.getElementById('goal');
  if (LS.params.get('preview') === '1') document.body.classList.add('preview-bg');
  const icon = kind === 'gift' ? '💎' : '❤';

  root.innerHTML = `
    <div class="head"><span class="icon">${icon}</span><span class="label"></span><span class="nums"><b class="cur">0</b><span class="sep">/</span><span class="tgt">0</span></span></div>
    <div class="track"><div class="fill"><div class="stripes"></div></div><div class="spark"></div></div>
    <div class="done"></div>`;
  const $ = (s) => root.querySelector(s);
  let shown = 0;
  let celebrated = false;

  function render(goal, settings) {
    const label = (kind === 'gift' ? settings.giftGoalLabel : settings.likeGoalLabel) || goal.label || LS.t(kind === 'gift' ? 'giftGoal' : 'likeGoal');
    $('.label').textContent = label;
    $('.tgt').textContent = LS.fmt(goal.target);
    const pct = Math.max(0, Math.min(1, goal.current / Math.max(1, goal.target)));
    const counter = { v: shown };
    gsap.to(counter, { v: goal.current, duration: .8, ease: 'power2.out', onUpdate: () => { $('.cur').textContent = LS.fmt(Math.round(counter.v)); } });
    shown = goal.current;
    gsap.to($('.fill'), { width: `${pct * 100}%`, duration: .9, ease: 'expo.out' });
    gsap.to($('.spark'), { left: `${pct * 100}%`, opacity: pct > 0 && pct < 1 ? 1 : 0, duration: .9, ease: 'expo.out' });

    if (pct >= 1 && !celebrated) {
      celebrated = true;
      LS.sound('goal');
      $('.done').textContent = LS.t('reached');
      gsap.timeline()
        .fromTo($('.done'), { scale: .4, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: 'back.out(2.5)' })
        .to(root, { scale: 1.04, duration: .15, yoyo: true, repeat: 3 }, 0)
        .to($('.done'), { opacity: 0, duration: .5, delay: 4 });
    }
    if (pct < 1) celebrated = false;
  }

  gsap.to($('.stripes'), { backgroundPositionX: '-112px', duration: 1.2, repeat: -1, ease: 'none' });
  gsap.from(root, { y: -40, opacity: 0, duration: .8, ease: 'expo.out' });

  LS.connect({ state(s, settings) { render(kind === 'gift' ? s.giftGoal : s.likeGoal, settings); } });

  if (LS.params.get('demo') === '1') {
    const target = kind === 'gift' ? 1000 : 10000;
    render({ target, current: Math.round(target * Number(LS.params.get('pct') || .62)), label: '' }, {});
  }
})();
