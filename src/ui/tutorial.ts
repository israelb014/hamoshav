import { isRipe } from '../sim/actions';
import type { UI } from './ui';

interface Step {
  text: string;
  actions: string[];
  target: (ui: UI) => { entity?: number; dom?: string } | null;
}

const STEPS: Step[] = [
  {
    text: 'שתלו חיטה: הקישו על חלקה ריקה ובחרו חיטה',
    actions: ['plant'],
    target: (ui) => {
      const p = ui.s.entities.find((e) => e.kind === 'plot' && !e.plot.crop);
      return p ? { entity: p.id } : null;
    },
  },
  {
    text: 'השקו: הקישו על החלקה שנשתלה כדי להשקות אותה',
    actions: ['water'],
    target: (ui) => {
      const p = ui.s.entities.find((e) => e.kind === 'plot' && e.plot.crop && e.plot.water <= 0);
      return p ? { entity: p.id } : null;
    },
  },
  {
    text: 'קטפו: החיטה מבשילה תוך 2 דקות. כשהיא בשלה – הקישו עליה',
    actions: ['harvest', 'harvestAll'],
    target: (ui) => {
      const p = ui.s.entities.find((e) => e.kind === 'plot' && isRipe(e.plot)) ?? ui.s.entities.find((e) => e.kind === 'plot' && e.plot.crop);
      return p ? { entity: p.id } : null;
    },
  },
  {
    text: 'האכילו תרנגולת: הקישו על הלול ואז על "האכל"',
    actions: ['feed', 'feedAll'],
    target: (ui) => {
      const c = ui.s.entities.find((e) => e.kind === 'structure' && e.animals?.some((a) => a.type === 'chicken'));
      return c ? { entity: c.id } : null;
    },
  },
  {
    text: 'מכרו בשוק: פתחו את השוק ומכרו את מה שקטפתם',
    actions: ['sell'],
    target: () => ({ dom: 'nav-market' }),
  },
];

const ARROW = `<svg viewBox="0 0 44 54"><path d="M14,2 h16 v26 h12 L22,52 L2,28 h12z" fill="#F39A2B" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;

export class Tutorial {
  private el: HTMLElement | null = null;
  private arrow: HTMLElement | null = null;
  private shownStep = -1;

  constructor(private ui: UI) {}

  get active() {
    return !this.ui.s.tutorial.done;
  }

  onAction(name: string) {
    if (!this.active) return;
    const st = STEPS[this.ui.s.tutorial.step];
    if (!st || !st.actions.includes(name)) return;
    this.ui.s.tutorial.step++;
    if (this.ui.s.tutorial.step >= STEPS.length) {
      this.ui.s.tutorial.done = true;
      this.ui.toast('כל הכבוד! סיימתם את ההדרכה', true);
    }
    this.ui.store.save();
    this.update();
  }

  skip() {
    this.ui.s.tutorial.done = true;
    this.ui.store.save();
    this.update();
  }

  restart() {
    this.ui.s.tutorial = { step: 0, done: false };
    this.shownStep = -1;
    this.update();
  }

  update() {
    const show = this.active && !this.ui.modalOpen && !this.ui.editMode && !this.ui.sheet;
    if (!show) {
      this.el?.remove();
      this.arrow?.remove();
      this.el = this.arrow = null;
      this.shownStep = -1;
      return;
    }
    const step = this.ui.s.tutorial.step;
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'tut';
      this.el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.skip')) this.skip();
      });
      this.ui.col.appendChild(this.el);
      this.arrow = document.createElement('div');
      this.arrow.className = 'tut-arrow';
      this.arrow.innerHTML = ARROW;
      this.ui.col.appendChild(this.arrow);
    }
    if (this.shownStep !== step) {
      this.shownStep = step;
      this.el.innerHTML = `<span class="stp">${step + 1}/${STEPS.length}</span><span class="tx">${STEPS[step].text}</span><button class="skip">דלג</button>`;
    }
    this.position();
  }

  position() {
    if (!this.el || !this.arrow) return;
    const st = STEPS[this.ui.s.tutorial.step];
    const t = st?.target(this.ui);
    const sheet = this.ui.sheet;
    let pos: { x: number; y: number } | null = null;
    if (t?.dom && !sheet) {
      const r = document.getElementById(t.dom)?.getBoundingClientRect();
      if (r) pos = { x: r.left + r.width / 2, y: r.top };
    } else if (t?.entity !== undefined && !sheet) {
      pos = this.ui.scene.screenPos(t.entity, true);
    }
    if (!pos) {
      this.arrow.style.display = 'none';
      return;
    }
    const col = this.ui.col.getBoundingClientRect();
    this.arrow.style.display = 'block';
    this.arrow.style.left = `${pos.x - col.left}px`;
    this.arrow.style.top = `${pos.y - col.top}px`;
  }
}
