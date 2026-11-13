import React, { useState } from 'react';
import { TaskId, TASK_IDS } from '../utils/trainerLogic';
import { SwipeableSheet } from './LiquidGlassControls';

interface CheatsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: 'all' | TaskId;
}

interface CheatSectionData {
  task: TaskId;
  title: string;
  pages: string;
  accentVar: string;
  softVar: string;
  keywords: string;
  content: React.ReactNode;
}

const MnemonicBox: React.FC<{ title?: string; children: React.ReactNode }> = ({
  title = '⭐ ЗАПОМИНАЛКА',
  children,
}) => (
  <div
    className="p-2.5 rounded-xl my-1.5 text-[12px] leading-snug"
    style={{
      background: 'var(--ios-orange-soft)',
      border: '0.5px solid rgba(255, 149, 0, 0.32)',
      color: 'var(--ios-label)',
    }}
  >
    <div
      className="text-[10.5px] font-extrabold uppercase tracking-wider mb-0.5"
      style={{ color: 'var(--ios-orange)' }}
    >
      {title}
    </div>
    <div className="font-semibold">{children}</div>
  </div>
);

const TrapBox: React.FC<{ title?: string; children: React.ReactNode }> = ({
  title = '⚡ ЛОВУШКА ЕГЭ',
  children,
}) => (
  <div
    className="p-2.5 rounded-xl my-1.5 text-[12px] leading-snug"
    style={{
      background: 'var(--ios-red-soft)',
      border: '0.5px solid rgba(255, 59, 48, 0.28)',
      color: 'var(--ios-label)',
    }}
  >
    <div
      className="text-[10.5px] font-extrabold uppercase tracking-wider mb-0.5"
      style={{ color: 'var(--ios-red)' }}
    >
      {title}
    </div>
    <div className="font-semibold">{children}</div>
  </div>
);

const BadgeTag: React.FC<{
  label: string;
  tone?: 'green' | 'red' | 'blue' | 'orange' | 'purple';
}> = ({ label, tone = 'blue' }) => {
  const map = {
    green: { bg: 'var(--ios-green-soft)', color: 'var(--ios-green)' },
    red: { bg: 'var(--ios-red-soft)', color: 'var(--ios-red)' },
    blue: { bg: 'var(--ios-blue-soft)', color: 'var(--ios-blue)' },
    orange: { bg: 'var(--ios-orange-soft)', color: 'var(--ios-orange)' },
    purple: { bg: 'var(--ios-purple-soft)', color: 'var(--ios-purple)' },
  }[tone];
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide shrink-0"
      style={{ background: map.bg, color: map.color }}
    >
      {label}
    </span>
  );
};

const CHEAT_SECTIONS: CheatSectionData[] = [
  {
    task: '4',
    title: '4 · ОРФОЭПИЧЕСКИЕ НОРМЫ (УДАРЕНИЯ)',
    pages: 'Словник ФИПИ',
    accentVar: 'var(--ios-orange)',
    softVar: 'var(--ios-orange-soft)',
    keywords: 'ударения баловать звонит торты банты шарфы клала крала слала послала отослала доверху донизу досуха засветло затемно',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-orange)' }}>
          Главные закономерности словника ФИПИ № 4
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Женский род прош. вр. на -ЛА́:</strong> <em>брала́, взяла́, влила́сь, гнала́, звала́, лгала́, лила́, пила́, рвала́</em>.<br />
            <strong style={{ color: 'var(--ios-red)' }}>Исключения (ударение на основе):</strong> <em>кла́ла, кра́ла, сла́ла, посла́ла, отосла́ла</em>.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Глаголы на -ИТЬ (3 л. на -И́Т/-Я́Т):</strong> <em>звони́т, включи́т, вручи́т, облегчи́т, сверли́т, укрепи́т, щеми́т</em>.<br />
            <strong>Исключения:</strong> <em>опо́шлить — опо́шлит, осве́домиться — осве́домится, заку́порить, отку́порить</em>.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Неподвижное ударение на основе (сущ.):</strong> <em>ба́нты, то́рты, ша́рфы, кра́ны, ле́кторы, бухга́лтеры, сре́дства</em>.<br />
            <strong>На окончании:</strong> <em>еретик — еретика́, столя́р, маля́р, досу́г, катало́г, некроло́г, кварта́л</em>.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Наречия с ДО- и ЗА-:</strong> <em>до́верху, до́низу, до́суха, за́светло, за́темно</em> (но: <em>донéльзя, добела́, докрасна́</em>).
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '5',
    title: '5 · ПАРОНИМЫ (ЛЕКСИЧЕСКИЙ ВЫБОР)',
    pages: 'Словарь ФИПИ',
    accentVar: 'var(--ios-orange)',
    softVar: 'var(--ios-orange-soft)',
    keywords: 'паронимы абонент абонемент адресат адресант дипломат дипломант эффектный эффективный экономический экономичный экономный',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-orange)' }}>
          Ключевые группы паронимов ФИПИ № 5
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            • <strong>Абонент</strong> (человек) / <strong>Абонемент</strong> (билет, документ)<br />
            • <strong>Адресат</strong> (получатель) / <strong>Адресант</strong> (отправитель)<br />
            • <strong>Дипломат</strong> (посол) / <strong>Дипломант</strong> (призёр конкурса)
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            • <strong>Эффектный</strong> (броский) / <strong>Эффективный</strong> (действенный)<br />
            • <strong>Экономический</strong> (кризис) / <strong>Экономичный</strong> (двигатель) / <strong>Экономный</strong> (человек)<br />
            • <strong>Гарантийный</strong> (талон, срок) / <strong>Гарантированный</strong> (доход, право)
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '6',
    title: '6 · ЛЕКСИЧЕСКИЕ НОРМЫ (ПЛЕОНАЗМ И ПАРОНИМЫ)',
    pages: 'Нормы речи',
    accentVar: 'var(--ios-orange)',
    softVar: 'var(--ios-orange-soft)',
    keywords: 'плеоназм тавтология памятный сувенир свободная вакансия первая премьера играть роль иметь значение одержать победу',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-orange)' }}>
          Исключение лишнего слова или замена неверного слова
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>1. Исключить лишнее слово (плеоназм):</strong><br />
            <em>памятный сувенир, свободная вакансия, первая премьера, главная суть, коллега по работе, взаимный диалог, прейскурант цен, хронометраж времени</em>.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>2. Заменить слово (нарушение сочетаемости):</strong><br />
            <em>играть роль</em> (не значение), <em>иметь значение</em> (не роль), <em>одержать победу</em>, <em>потерпеть поражение</em>, <em>принять меры</em>, <em>предпринять шаги</em>, <em>повысить уровень</em>.
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '7',
    title: '7 · МОРФОЛОГИЧЕСКИЕ НОРМЫ (ФОРМА СЛОВА)',
    pages: 'Нормы грамматики',
    accentVar: 'var(--ios-orange)',
    softVar: 'var(--ios-orange-soft)',
    keywords: 'чулок носков помидоров ботинок погон эполет поезжай ляг лягте обеими пятисот более лучше',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-orange)' }}>
          Образование грамматических форм (Задание № 7)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Р.п. мн. ч. существительных:</strong><br />
            Нулевое окончание: <em>чулок, ботинок, сапог, валенок, погон, эполет, партизан, солдат, яблок, мест, дел</em>.<br />
            Окончание <strong>-ОВ</strong>: <em>носков, гольфов, помидоров, томатов, апельсинов, мандаринов, килограммов, гектаров</em>.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Прилагательные, числительные, глаголы:</strong><br />
            • Нельзя: «более лучше» → <em>лучше / более хорошо</em>.<br />
            • Р.п.: <em>пятисот, шестисот, семисот</em>; Т.п.: <em>пятьюстами, обоими (м./ср.р.), обеими (ж.р.)</em>.<br />
            • Повелит.: <em>поезжай, ляг, лягте, положи, машет, жжёт, печёт</em>.
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '8',
    title: '8 · СИНТАКСИЧЕСКИЕ НОРМЫ (2 БАЛЛА)',
    pages: 'А Б В Г Д',
    accentVar: 'var(--ios-orange)',
    softVar: 'var(--ios-orange-soft)',
    keywords: 'причастный деепричастный оборот связь подлежащего и сказуемого несогласованное приложение предлог по приезде благодаря вопреки однородные косвенная речь',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-orange)' }}>
          10 классических синтаксических ошибок в задании № 8
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            • <strong>Причастный оборот:</strong> разрыв оборота определяемым словом или неверный падеж причастия.<br />
            • <strong>Деепричастный оборот:</strong> субъект деепричастия не совпадает с подлежащим в И.п.<br />
            • <strong>Предлог:</strong> <em>по приезде, по окончании, по прибытии</em> (П.п.); <em>благодаря, согласно, вопреки</em> + Д.п. (чему?).
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            • <strong>Подлежащее и сказуемое:</strong> <em>Все, кто пришёл (ед.), сдали (мн.)</em>.<br />
            • <strong>Несогласованное приложение:</strong> при родовом слове («в романе», «в пьесе») название в кавычках ставится в И.п.<br />
            • <strong>Однородные члены:</strong> общее дополнение при глаголах с разным управлением; смешение двойных союзов.
          </div>
        </div>
      </div>
    ),
  },
  /* ==========================================================================
     ЗАДАНИЕ 9: ПРАВОПИСАНИЕ КОРНЕЙ (СТР. 2–13)
     ========================================================================== */
  {
    task: '9',
    title: '9 · ПРАВОПИСАНИЕ КОРНЕЙ',
    pages: 'Стр. 2–5, 8–9',
    accentVar: 'var(--ios-blue)',
    softVar: 'var(--ios-blue-soft)',
    keywords:
      'гар гор зар зор клан клон твар твор плав плов бер бир дер дир мер мир пер пир тер тир блест блист жег жиг стел стил чет чит кас кос лаг лож раст ращ рос скак скоч мак мок равн ровн пригарь выгарки изгарь утварь пловец пловчиха плывун сочетание чета побирушка розжиг полог слоговой росток вырост подростковый ростовщик отрасль ростов ростислав скачок скачу равнина равнение поравняться уровень поровну ровесник выровнять снять снимать понять понимать внять внимать сжать сжимать намять наминать проклясть проклинать начать начинать распять распинать опоздать поздний раскроить кройка развивается развевается увидать увядать полоскать поласкать благословлять прославлять разрядить разреженный посвятить просветить честолюбивый чистоплотный скрепить скрипеть умалять умолять примерять примирять обессилеть обессилить старожил сторожил запевать запивать отварить отворить крыжовник шорох шов капюшон трущоба мажорный шоссе шоколад шофер жокей жонглер чащоба чокаться чопорный шорты шок шомпол ожог поджог циферблат панцирь цилиндр цыган на цыпочках цыпленок цыц птицы огурцы лисицын сестрицын кампания компания палисадник утрамбовать бюллетень жюри парашют брошюра корифей апелляция привилегия винегрет интеллигент панорама дирижер вестибюль гарнизон деликатес иждивенец криминалист меценат наваждение ностальгия оригинальный периферия предварительный прерогатива реставрировать суверенитет феномен филантроп эликсир',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-blue-soft)',
            border: '0.5px solid rgba(10, 132, 255, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-blue)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Определи тип корня:</strong> чередующийся, проверяемый ударением или непроверяемый (словарный).<br />
            2. <strong>Для чередующихся корней:</strong> проверь условие (ударение, суффикс -А-, согласная корня, значение) и сверь со списком исключений!<br />
            3. <strong>Для проверяемых корней:</strong> подбери проверочное слово (помни о строгом запрете на глаголы на <em>-ывать / -ивать</em> и смысловых омофонах).
          </div>
        </div>

        {/* 1. ЧЕРЕДУЮЩИЕСЯ КОРНИ (4 ГРУППЫ ПРАВИЛ) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              1. Чередующиеся корни • 4 группы правил
            </div>
            <BadgeTag label="ЗНАТЬ В ЛИЦО" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* ГРУППА 1: УДАРЕНИЕ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between gap-1 mb-1 font-bold" style={{ color: 'var(--ios-blue)' }}>
                <span>• Группа 1. Ударение</span>
                <BadgeTag label="гар/гор, зар/зор" tone="orange" />
              </div>
              • Без уд. <strong>О</strong>: <em>гар / гор, клан / клон, твар / твор</em> (загора́ть, поклони́ться, творе́ц).<br />
              • Без уд. <strong>А</strong>: <em>зар / зор</em> (заря́, зарни́ца, но: зо́рька).<br />
              • <strong>плав / плов:</strong> всегда <strong>А</strong> (плаву́чий), кроме исключений.
              <div className="mt-1 text-[11px] p-1.5 rounded-lg" style={{ background: 'var(--ios-orange-soft)', color: 'var(--ios-orange)' }}>
                <strong>Искл.:</strong> при́гарь, вы́гарки, и́згарь, у́тварь; плове́ц, пловчи́ха, плыву́н.
              </div>
            </div>

            {/* ГРУППА 2: СУФФИКС -А- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between gap-1 mb-1 font-bold" style={{ color: 'var(--ios-blue)' }}>
                <span>• Группа 2. Суффикс -А-</span>
                <BadgeTag label="Есть -А- → И" tone="purple" />
              </div>
              • <strong>бер/бир, дер/дир, мер/мир, пер/пир, тер/тир, блест/блист, жег/жиг, стел/стил, чет/чит:</strong> есть суффикс <em>-А-</em> → пиши <strong>И</strong> (собира́ть, застила́ть, сжига́ть).<br />
              • <strong>кас / кос:</strong> есть <em>-А-</em> → <em>каса́ться</em>; нет → <em>косну́ться</em>.
              <div className="mt-1 text-[11px] p-1.5 rounded-lg" style={{ background: 'var(--ios-purple-soft)', color: 'var(--ios-purple)' }}>
                <strong>Искл.:</strong> сочета́ние, чета́, побиру́шка, ро́зжиг.
              </div>
            </div>

            {/* ГРУППА 3: СОГЛАСНАЯ КОРНЯ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between gap-1 mb-1 font-bold" style={{ color: 'var(--ios-blue)' }}>
                <span>• Группа 3. Согласная корня</span>
                <BadgeTag label="лаг/лож, раст/рос" tone="green" />
              </div>
              • <strong>лаг / лож:</strong> перед <em>Г</em> → <strong>А</strong> (полага́ть); перед <em>Ж</em> → <strong>О</strong> (положи́ть).<br />
              • <strong>раст / ращ / рос:</strong> перед <em>СТ, Щ</em> → <strong>А</strong> (расти́, выра́щивать); перед <em>С</em> → <strong>О</strong> (вы́рос).<br />
              • <strong>скак / скоч:</strong> перед <em>К</em> → <strong>А</strong> (скака́ть); перед <em>Ч</em> → <strong>О</strong> (вскочи́ть).
              <div className="mt-1 text-[11px] p-1.5 rounded-lg" style={{ background: 'var(--ios-green-soft)', color: 'var(--ios-green)' }}>
                <strong>Искл.:</strong> по́лог, слоговой; росто́к, на вы́рост, подростко́вый, ростовщи́к, о́трасль, Росто́в, Ростисла́в; скачо́к, скачу́.
              </div>
            </div>

            {/* ГРУППА 4: ЗНАЧЕНИЕ СЛОВА */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between gap-1 mb-1 font-bold" style={{ color: 'var(--ios-blue)' }}>
                <span>• Группа 4. Значение слова</span>
                <BadgeTag label="мак/мок, равн/ровн" tone="orange" />
              </div>
              • <strong>мак:</strong> погружать в жидкость (мака́ть сухарь в чай).<br />
              • <strong>мок:</strong> пропускать, впитывать жидкость (непромока́емый плащ, сапоги промока́ют).<br />
              • <strong>равн:</strong> равный, одинаковый (уравне́ние, с коэффициентом).<br />
              • <strong>ровн:</strong> ровный, гладкий, прямой (подровня́ть грядку, сровня́ть с землей).
              <div className="mt-1 text-[11px] p-1.5 rounded-lg" style={{ background: 'var(--ios-orange-soft)', color: 'var(--ios-orange)' }}>
                <strong>Искл.:</strong> равни́на, поравня́ться, уро́вень, поро́вну, рове́сник, вы́ровнять (дорожку).
              </div>
            </div>
          </div>

          {/* ЧЕРЕДОВАНИЕ А(Я) - ИМ(ИН) */}
          <div className="mt-2 p-2.5 rounded-xl text-[12px] leading-snug" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
              Чередование а(я) — им(ин) (зависит от суффикса -А-):
            </div>
            Если за корнем следует суффикс <strong>-А-</strong>, пишется <strong>-ИМ- / -ИН-</strong>:<br />
            • сн<strong>я</strong>ть — сн<strong>им</strong><strong>а</strong>ть • пон<strong>я</strong>ть — пон<strong>им</strong><strong>а</strong>ть • вн<strong>я</strong>ть — вн<strong>им</strong><strong>а</strong>ть<br />
            • сж<strong>а</strong>ть — сж<strong>им</strong><strong>а</strong>ть • нам<strong>я</strong>ть — нам<strong>ин</strong><strong>а</strong>ть • прокл<strong>я</strong>сть — прокл<strong>ин</strong><strong>а</strong>ть<br />
            • нач<strong>а</strong>ть — нач<strong>ин</strong><strong>а</strong>ть • расп<strong>я</strong>ть — расп<strong>ин</strong><strong>а</strong>ть
          </div>
        </div>

        {/* 2. ПРОВЕРЯЕМЫЕ КОРНИ & СТРОЖАЙШИЙ ЗАПРЕТ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              2. Проверяемые корни • Однокоренные vs Формы слова
            </div>
            <BadgeTag label="ПРОВЕРКА УДАРЕНИЕМ" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                ОДНОКОРЕННЫЕ VS ФОРМЫ СЛОВА
              </div>
              • <strong>Однокоренные слова:</strong> разные части речи с общим смысловым корнем (<em>снег, снежный, снеговик, подснежник</em>).<br />
              • <strong>Формы одного слова:</strong> меняются только окончания (<em>вода, водой, о воде; бегу, бежишь, бегут</em>).<br />
              • <strong>Как проверять:</strong> измени слово или подбери родственное так, чтобы сомнительная гласная оказалась <strong>под ударением</strong>.
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <TrapBox title="⛔ СТРОЖАЙШИЙ ЗАПРЕТ">
                Гласную <strong>«О»</strong> в корнях глаголов совершенного вида <strong>НЕЛЬЗЯ</strong> проверять глаголами несовершенного вида на <em>-ывать / -ивать</em>!<br />
                • <em>опозда́ть</em> → проверяем: <strong>по́здний</strong> (НЕ: <s>опа́здывать</s>!)<br />
                • <em>раскрои́ть</em> → проверяем: <strong>кро́йка</strong> (НЕ: <s>раскра́ивать</s>!)<br />
                • <em>проглоти́ть</em> → проверяем: <strong>гло́тка</strong> (НЕ: <s>прогла́тывать</s>!)
              </TrapBox>
            </div>
          </div>
        </div>

        {/* 3. ВСЕ 14 СМЫСЛОВЫХ ПАР ОМОФОНОВ ИЗ ТЕТРАДИ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              3. Смысловые пары корней-омофонов из тетради (14 пар)
            </div>
            <BadgeTag label="ВНИКАЙ В КОНТЕКСТ" tone="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11.5px] leading-snug">
            <div className="p-2 rounded-lg" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>развива́ется</strong> индустрия (разви́тие) vs <strong>развева́ется</strong> флаг (ве́ять)<br />
              • <strong>увида́ть</strong> издали (ви́деть) vs цветы <strong>увяда́ют</strong> (вя́нуть)<br />
              • <strong>полоска́ть</strong> бельё (поло́щет) vs <strong>поласка́ть</strong> щенка (ла́ска)<br />
              • <strong>благословля́ть</strong> (сло́во) vs <strong>прославля́ть</strong> героя (сла́ва)<br />
              • <strong>разряди́ть</strong> ружьё (разря́д) vs <strong>разрежённый</strong> воздух (ре́дкий)<br />
              • <strong>посвяти́ть</strong> стих (свя́тость) vs <strong>просвети́ть</strong> фонарём (свет)<br />
              • <strong>честолюби́вый</strong> человек (честь) vs <strong>чистопло́тный</strong> кот (чи́стый)
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>скрепи́ть</strong> листы (скре́пка) vs <strong>скрипе́ть</strong> дверью (скрип)<br />
              • <strong>умаля́ть</strong> заслуги (ма́лый) vs <strong>умоля́ть</strong> о пощаде (мо́лит)<br />
              • <strong>примеря́ть</strong> костюм (ме́рка) vs <strong>примиря́ть</strong> врагов (мир)<br />
              • сам <strong>обесси́лел</strong> (сам) vs враг <strong>обесси́лил</strong> армию (кого-то)<br />
              • коренной <strong>старожи́л</strong> (ста́рый) vs <strong>сторожи́л</strong> склад (сто́рож)<br />
              • <strong>запева́ть</strong> песню (петь) vs <strong>запива́ть</strong> водой (пить)<br />
              • <strong>отвари́ть</strong> картофель (ва́рка) vs <strong>отвори́ть</strong> ворота (ство́р)
            </div>
          </div>
        </div>

        {/* 4. О/Ё ПОСЛЕ ШИПЯЩИХ И И/Ы ПОСЛЕ Ц */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              4. О / Ё после шипящих и И / Ы после Ц в корне
            </div>
            <BadgeTag label="СТР. 8–9" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-orange)' }}>
                О / Ё ПОСЛЕ ШИПЯЩИХ В КОРНЕ
              </div>
              • <strong>Ё:</strong> есть чередование с <strong>Е</strong> в родственных словах: <em>жёлтый (желтеть), шёлк (шелка́), чёрный (чернеть), щёголь (щеголя́ть), дешёвый (дешевле), шёпот (шептать)</em>.<br />
              • <strong>О (исключения, нет Е):</strong> <em>крыжо́вник, шо́рох, шов, капюшо́н, трущо́ба, мажо́рный, шоссе́, шокола́д, шофёр, жоке́й, жонглёр, чащо́ба, чо́каться, чо́порный, шо́рты, шок, шомпол</em>.
              <TrapBox title="⚡ ЛОВУШКА ОЖОГ / ОЖЁГ">
                • <strong>Ожо́г / Поджо́г</strong> (существительное) → <strong>О</strong> (тяжёлый ожог руки).<br />
                • <strong>Ожёг / Поджёг</strong> (глагол) → <strong>Ё</strong> (он ожёг пальцы).
              </TrapBox>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                И / Ы ПОСЛЕ Ц В КОРНЕ & СЛОВАРНЫЕ СЛОВА
              </div>
              • <strong>После Ц всегда пишется И:</strong> <em>цифербла́т, па́нцирь, цили́ндр, медици́на, цирк, цитата</em>.<br />
              <div className="my-1 p-1.5 rounded-lg text-amber-900 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200">
                ⭐ <strong>Исключения с Ы в корне:</strong> <em>цыга́н на цы́почках подошёл к цыплёнку и цы́кнул: «цыц!»</em><br />
                (Также <strong>Ы</strong> пишется в окончаниях: <em>птицы, огурцы</em> и притяжательном суффиксе <em>-ын: лисицын, сестрицын</em>).
              </div>
              • <strong>Сложные словарные слова:</strong> <em>кампа́ния</em> (мероприятие) vs <em>компа́ния</em> (друзья / фирма), <em>палиса́дник, утрамбова́ть, бюллете́нь, жюри́, парашю́т, брошю́ра, корифе́й, апелля́ция, привиле́гия, винегре́т, интеллиге́нт, панорама, дирижёр, вестибюль, гарнизон, деликатес, иждивенец, криминалист, меценат, наваждение, ностальгия, оригинальный, периферия, предварительный, прерогатива, реставрировать, суверенитет, феномен, филантроп, эликсир</em>.
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '10',
    title: '10 · ПРАВОПИСАНИЕ ПРИСТАВОК',
    pages: 'Стр. 6–10, 14–17',
    accentVar: 'var(--ios-indigo)',
    softVar: 'var(--ios-indigo-soft)',
    keywords:
      'над под об от пред близ за на по до с взо о недо обогнуть соблюсти отобрать подойти сбить сжать несговорчивый несдобровать сгореть здесь здание здоровье ни зги не видно праязык прабабушка прародитель праотец прапамять прадед прообраз провозвестник прокоммунистический провидец пробежать проиграть роспись розыгрыш розвальни раздать расписать разыграть рассыпать без бес воз вос из ис низ нис раз рас чрез черес безвкусный мировоззрение разжать чрезмерный избрать разжечь беспечность исчезнуть ниспровергать исчерпать вспугнуть снисхождение фока хочешь поесть щец несдержанный несгораемый недоверие рассмотреть чересчур дисбаланс дисгармония расчёт рассчитывать а анти архи гипер гипо де дез диз дис интер инфра контр пан пост прото суб супер транс ультра экс экстра сыграть подытожить безымянный предыстория безынициативный отыскать розыгрыш безыдейный взимать изымать подымать сызнова сызмала межигровой сверхинтересный сверхидея сверхинициативный дезинформация суперигра постимпрессионизм постинфарктный предынфарктный контригра спортинвентарь пединститут трехимпульсный госимущество подъезд объезд необъятный подъём съёмка объявление субъект адъютант инъекция объект трансъевропейский дизъюнкция конъюнктура двухъярусный трёхъязычный четырёхъякорный въедливый изъян неотъемлемый фельдъегерь оргединица иняз детясли оргмомент орготдел партячейка главюрист минюст сэкономить льют вьюга воробьи рьяный подьячий арьергард пьеса портьера батальон компаньон почтальон павильон бульон шампиньон гильотина синьор котильон предобрый премилый преувеличивать преинтересный преграда прервать пресечь преступить предание превозносить преклоняться преставиться приморский привязать пригнать приехать приоткрыть приобнять привстать прилечь придумать приучить пританцовывать припевать присвистывать пребывать прибывать предавать придавать предел придел преемник приёмник презирать призреть прекрасный приукрасить преступить приступить претворить притворить претвориться притвориться преклониться приклониться превратный привратник претерпеть притерпеться преходящий приходящая прекратить непременно претензия камень преткновения беспрекословно предания старины предаваться прелюдия прилюдно пресытиться преследовать пренебрежение преобразовать преклонный пресловутый пресмыкаться препона преамбула превалировать превзойти превозмочь превратить презент президент президиум преимущество премировать премьера преодолеть времяпрепровождение препинания препираться преподаватель препятствие пререкаться прерогатива престиж претендент преуспевать префект преферанс прецедент непрестанный причудливый привередливый примитивный приговор сопричастный прискорбный пригожий пристрастный приобщение приемлемый непригодный гостеприимство приспособиться неприхотливый призывающий прибаутка неприступный приволье присягать прибор приватизация привет привилегия привыкать пригласить пригодиться приготовить придираться призвание приказать приключение прилежный приличный примадонна пример принцип приобрести приоритет присмотреться причина приютить приятель приятный',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-blue-soft)',
            border: '0.5px solid rgba(10, 132, 255, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-blue)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Определи группу приставки:</strong> неизменяемая, на -З/-С, ПРЕ/ПРИ или Ы/И/Ъ/Ь.<br />
            2. <strong>Для приставок на -З/-С:</strong> проверь первый звук корня по фразе <em>«Фока...»</em>.<br />
            3. <strong>Для ПРЕ/ПРИ:</strong> проверь смысловое значение или омофонную пару. Для Ъ/Ь — проверь морфемную границу!
          </div>
        </div>

        {/* 1. НЕИЗМЕНЯЕМЫЕ, БЕГЛАЯ О, С-, ПРА/ПРО, РАЗ/РОЗ, -З/-С */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-indigo)' }}>
              1. Неизменяемые приставки, ПРА/ПРО и приставки на -З / -С
            </div>
            <BadgeTag label="НЕИЗМЕНЯЕМЫЕ И -З/-С" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-indigo)' }}>
                НЕИЗМЕНЯЕМЫЕ & ПРА / ПРО
              </div>
              • <strong>Неизменяемые:</strong> <em>над-, под-, об-, от-, пред-, близ-, за-, на-, по-, до-, с-, взо-, о-, недо-</em>.<br />
              • <strong>Беглая О:</strong> появляется перед согласной корня: <em>обогнуть, соблюсти, отобрать, подойти</em>.<br />
              • <strong>Приставка С- неизменяема!</strong> Всегда пишется с буквой С: <em>сбить, сжать, несговорчивый, несдобровать, сгореть</em>.<br />
              <div className="my-1 p-1.5 rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-200">
                ⭐ <strong>Здесь, здание, здоровье, ни зги не видно</strong> — буква З часть корня, приставки нет!
              </div>
              • <strong>ПРА- (= первоначальный, предок):</strong> <em>праязык, прабабушка, прародитель, праотец, прапамять, прадед</em>.<br />
              • <strong>ПРО-:</strong> во всех остальных случаях: <em>прообраз, провозвестник, прокоммунистический, провидец, пробежать</em>.<br />
              • <strong>РАЗ/РАС vs РОЗ/РОС:</strong> под ударением пиши <strong>О</strong> (<em>ро́спись, ро́зыгрыш, ро́звальни</em>), без ударения — <strong>А</strong> (<em>разда́ть, расписа́ть, разыгра́ть, рассыпа́ть</em>).
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-indigo)' }}>
                ПРИСТАВКИ НА -З И -С
              </div>
              • <em>без-/бес-, воз-(вз-)/вос-(вс-), из-/ис-, низ-/нис-, раз-(роз-)/рас-(рос-), чрез-(через-)/черес-</em>.<br />
              • <strong>Перед звонким согласным, гласным или сонорным → З:</strong> <em>безвкусный, мировоззрение, разжать, чрезмерный, избрать, разжечь</em>.<br />
              • <strong>Перед глухим согласным → С:</strong> <em>беспечность, исчезнуть, ниспровергать, исчерпать, вспугнуть, снисхождение</em>.<br />
              <MnemonicBox title="⭐ ЗАПОМИНАЛКА ВСЕХ ГЛУХИХ СОГЛАСНЫХ">
                «<strong>Ф</strong>о<strong>к</strong>а, <strong>х</strong>о<strong>ч</strong>е<strong>ш</strong>ь <strong>п</strong>о<strong>е</strong><strong>с</strong><strong>т</strong>ь <strong>щ</strong>е<strong>ц</strong>?» (Ф, К, Х, Ч, Ш, П, С, Т, Щ, Ц — только глухие!).
              </MnemonicBox>
              <div className="mt-1 text-[11px] p-1.5 rounded-lg" style={{ background: 'var(--ios-orange-soft)', color: 'var(--ios-orange)' }}>
                <strong>Капканы:</strong> <em>несдержанный, несгораемый</em> (две приставки: НЕ- и неизменяемая С-!); <em>недоверие</em> (приставки НЕ- и ДО-); <em>рассмотреть, чересчур</em>; иноязычные: <em>дисбаланс, дисгармония</em>; пары: <em>расчёт</em> (1 С) vs <em>рассчитывать</em> (2 С); иноязычные: <em>а-, анти-, архи-, гипер-, гипо-, де-, дез-, диз-, дис-, интер-, инфра-, контр-, пан-, пост-, прото-, суб-, супер-, транс-, ультра-, экс-, экстра-</em>.
              </div>
            </div>
          </div>
        </div>

        {/* 2. Ы/И ПОСЛЕ ПРИСТАВОК & РАЗДЕЛИТЕЛЬНЫЕ Ъ И Ь */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-indigo)' }}>
              2. Ы / И после приставок & Разделительные Ъ и Ь
            </div>
            <BadgeTag label="Ы / И & Ъ / Ь" tone="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                Ы / И ПОСЛЕ ПРИСТАВОК (СТР. 7, 14)
              </div>
              • <strong>Русская приставка на согл. → Ы:</strong> <em>сыграть, подытожить (под+итог), безымянный, предыстория, безынициативный, отыскать, розыгрыш, безыдейный</em>.
              <TrapBox title="⚡ ИСКЛЮЧЕНИЯ">
                <strong>взимать</strong> (но: <em>изымать, подымать!</em>), <em>сызнова, сызмала</em> (пишутся с <strong>Ы</strong>!).
              </TrapBox>
              • <strong>СВЕРХ-, МЕЖ- → пиши И:</strong> <em>межигровой, сверхинтересный, сверхидея, сверхинициативный</em>.<br />
              • <strong>После приставки на гласную → И:</strong> <em>проиграть, поиграть</em>.<br />
              • <strong>Иноязычные приставки (дез-, контр-, пан-, пост-, суб-, супер-, транс-, интер-) → пиши И:</strong> <em>дезинформация, суперигра, постимпрессионизм, постинфарктный (но русский: предынфарктный!), контригра</em>.<br />
              • <strong>Сложные слова → И:</strong> <em>спортинвентарь, пединститут, трехимпульсный, госимущество</em>.
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                РАЗДЕЛИТЕЛЬНЫЕ Ъ И Ь (СТР. 7–8, 14–15)
              </div>
              • <strong>Ъ пишется строго перед Е, Ё, Ю, Я:</strong><br />
              1) После русских приставок на согл.: <em>подъезд, объезд, необъятный, подъём, съёмка, объявление</em>.<br />
              2) После иноязычных приставок на согл. (<em>ад-, ин-, кон-, об-, диз-, транс-, контр-, суб-, пан-</em>): <em>субъект, адъютант, инъекция, объект, трансъевропейский, дизъюнкция, конъюнктура</em>.<br />
              3) В сложных числительных двух-, трёх-, четырёх-: <em>двухъярусный, трёхъязычный, четырёхъякорный</em>.<br />
              4) Слова: <em>въедливый, изъян, неотъемлемый, фельдъегерь</em>.<br />
              <div className="mt-1 p-1.5 rounded-lg text-rose-700 bg-rose-50 border border-rose-200">
                <strong>⛔ БЕЗ Ъ (сложносокращенные):</strong> <em>оргединица, иняз, детясли, оргмомент, орготдел, партячейка, главюрист, Минюст, сэкономить</em>!
              </div>
              • <strong>Ь пишется в корне/суффиксе перед Е, Ё, Ю, Я, И:</strong> <em>льют, вьюга, воробьи, рьяный, подьячий, арьергард, пьеса, портьера</em>.<br />
              • В заимствованных словах перед <strong>О</strong>: <em>батальон, компаньон, почтальон, павильон, бульон, шампиньон, гильотина, синьор, котильон</em>.
            </div>
          </div>
        </div>

        {/* 3. ПРЕ- И ПРИ- */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-indigo)' }}>
              3. Приставки ПРЕ- и ПРИ- • Все 13 пар омофонов и полный словарь (стр. 9–10, 16–17)
            </div>
            <BadgeTag label="ВСЕ 13 ПАР" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong style={{ color: 'var(--ios-red)' }}>• Значения ПРЕ-:</strong><br />
              1. <strong>= Очень, высшая степень:</strong> <em>предобрый, премилый, преувеличивать, преинтересный</em>.<br />
              2. <strong>= Пере- («через», «по-иному»):</strong> <em>преграда, прервать, пресечь, преступить закон, предание</em>.<br />
              3. <strong>= Торжественность:</strong> <em>превозносить, преклоняться, преставиться</em>.
            </div>
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong style={{ color: 'var(--ios-blue)' }}>• Значения ПРИ-:</strong><br />
              1. <strong>Приближение, присоединение, близость:</strong> <em>приморский, привязать, пригнать, приехать</em>.<br />
              2. <strong>Неполнота действия (= слегка):</strong> <em>приоткрыть, приобнять, привстать, прилечь</em>.<br />
              3. <strong>Доведение действия до конца:</strong> <em>придумать, приучить</em>.<br />
              4. <strong>Сопутствующее действие:</strong> <em>пританцовывать, припевать, присвистывать</em>.
            </div>
          </div>

          {/* ВСЕ 13 ПАР ОМОФОНОВ */}
          <div className="mt-2 text-[12px] leading-snug">
            <div className="font-extrabold uppercase text-[11px] mb-1" style={{ color: 'var(--ios-indigo)' }}>
              Все 13 пар смысловых омофонов ПРЕ- / ПРИ-:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2.5 rounded-xl text-[11.5px]" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div>• пре<strong>бывать</strong> в городе (находиться) / при<strong>бывать</strong> в город (приезжать)</div>
              <div>• пре<strong>давать</strong> друга (выдавать тайну) / при<strong>давать</strong> значение (прибавлять вид)</div>
              <div>• пре<strong>дел</strong> терпения (граница) / при<strong>дел</strong> (боковой пристроенный алтарь в церкви)</div>
              <div>• пре<strong>емник</strong> президента (продолжатель) / включить при<strong>ёмник</strong> (радио)</div>
              <div>• пре<strong>зирать</strong> трусов (без уважения) / при<strong>зреть</strong> сироту (дать приют)</div>
              <div>• пре<strong>красный</strong> день (очень) / при<strong>украсить</strong> достижения (неполнота)</div>
              <div>• пре<strong>ступить</strong> закон (нарушить) / при<strong>ступить</strong> к сочинению (начать)</div>
              <div>• пре<strong>творить</strong> мечту в жизнь (осуществить) / при<strong>творить</strong> дверь (прикрыть)</div>
              <div>• пре<strong>твориться</strong> в жизнь (сбыться) / при<strong>твориться</strong> спящим (принять иной вид)</div>
              <div>• пре<strong>клониться</strong> (перед талантом) / при<strong>клониться</strong> к земле (приблизиться)</div>
              <div>• пре<strong>вратный</strong> смысл (непостоянный) / при<strong>вратник</strong> (сторож у ворот)</div>
              <div>• пре<strong>терпеть</strong> невзгоды (перетерпеть) / при<strong>терпеться</strong> к невзгодам (привыкнуть)</div>
              <div className="sm:col-span-2">• пре<strong>ходящий</strong> успех (временный) / при<strong>ходящая</strong> няня (пришедшая на время)</div>
            </div>
          </div>

          {/* ПОЛНЫЙ СЛОВАРЬ ПРЕ- И ПРИ- */}
          <div className="mt-2 space-y-1.5 text-[11.5px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-red-soft)' }}>
              <strong style={{ color: 'var(--ios-red)' }}>ПРЕ- (словарь стр. 10, 17):</strong> <em>прекратить, непременно, претензия, камень преткновения, беспрекословно, предания (старины), предаваться (размышлениям), прелюдия (но прилюдно!), пресытиться, преследовать, пренебрежение, преобразовать, преклонный (возраст), пресловутый, пресмыкаться, препона, преамбула, превалировать, превзойти, превозмочь, превозносить, превратить, презент, президент, президиум, преимущество, премировать, премьера, преодолеть, времяпрепровождение, препинания, препираться, преподаватель, препятствие, пререкаться, прерогатива, престиж, претендент, преуспевать, префект, преферанс, прецедент, непрестанный</em>.
            </div>
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-blue-soft)' }}>
              <strong style={{ color: 'var(--ios-blue)' }}>ПРИ- (словарь стр. 10, 17):</strong> <em>причудливый, привередливый, прилюдно, примитивный, приговор, сопричастный, прискорбный, пригожий, пристрастный, приобщение (к искусству), приемлемый, непригодный, гостеприимство, приспособиться, неприхотливый, призывающий, прибаутка, неприступный, приволье, присягать, прибор, приватизация, привет, привилегия, привыкать, пригласить, пригодиться, приготовить, придираться, придумать, призвание, приказать, приключение, прилежный, приличный, примадонна, пример, принцип, приобрести, приоритет, присмотреться, приукрасить, причина, приютить, приятель, приятный</em>.
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '11',
    title: '11 · ПРАВОПИСАНИЕ СУФФИКСОВ',
    pages: 'Стр. 11–19',
    accentVar: 'var(--ios-purple)',
    softVar: 'var(--ios-purple-soft)',
    keywords:
      'ик ек беглая гласная ец иц пальтецо платьице ичк ечк инк енк нищенка неженка монашенка француженка инств енств чик щик зоя ждет неизменяемые суффиксы изн ин ник ниц овин отн овн от ост ер шипящие ц оньк еньк ова ева ыва ива ва евыва переходность проржавело обессилеть обессилить обезлюдеть обезлюдить выздороветь плесневеть ворочать опротиветь червиветь затмевать застревать разевать продлевать увещевать встревать намереваться сомневаться обуревать подразумевать недоумевать ив ев милостивый юродивый чив лив к ск чат аистов ступенчатый дощатый ветреный ветряной масленый масляный правило окно издавна досуха слева вправо насухо заново доверчиво владишка сворачивать',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-purple-soft)',
            border: '0.5px solid rgba(175, 82, 222, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-purple)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Определи часть речи слова:</strong> существительное, глагол, причастие/деепричастие, прилагательное или наречие.<br />
            2. <strong>Для существительных:</strong> проверь род, ударение, исходное слово, беглую гласную или неизменяемость суффикса.<br />
            3. <strong>Для глаголов:</strong> поставь в 1 л. ед. ч. («Я»), проверь ударный <em>-ВА-</em>, переходность действия или список исключений!
          </div>
        </div>

        {/* 1. СУФФИКСЫ СУЩЕСТВИТЕЛЬНЫХ (10 ПРАВИЛ) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              1. Суффиксы существительных (10 правил из тетради)
            </div>
            <BadgeTag label="СУЩЕСТВИТЕЛЬНЫЕ" tone="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* -ИК- / -ЕК- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                • 1. -ИК- / -ЕК- (Беглая гласная)
              </div>
              • <strong>-ик- (-ник-, -чик-):</strong> сохраняет гласную при склонении (<em>ключ<strong>ик</strong> → нет ключ<strong>ик</strong>а, шалаш<strong>ик</strong></em>).<br />
              • <strong>-ек-:</strong> имеет «беглую» гласную, выпадающую при склонении (<em>замоч<strong>ек</strong> → замоч<strong>к</strong>а, подароч<strong>ек</strong> → подароч<strong>к</strong>а</em>).
            </div>

            {/* -ЕЦ- / -ИЦ- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                • 2. -ЕЦ- / -ИЦ- (Род и ударение)
              </div>
              <div className="mb-1 text-[11px] p-1 rounded font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                ⭐ «Брат<strong>ец</strong> но́сит пальт<strong>е</strong>цо́, а сестр<strong>иц</strong>а — пла́ть<strong>и</strong>це»
              </div>
              • <strong>Муж. р. → -ец-:</strong> <em>краса́вец, гварде́ец</em>.<br />
              • <strong>Жен. р. → -иц-:</strong> <em>деви́ца, краса́вица</em>.<br />
              • <strong>Ср. р.:</strong> до ударения <strong>-ец-</strong> (<em>пальт<strong>е</strong>цо́, ружь<strong>е</strong>цо́</em>); после ударения <strong>-иц-</strong> (<em>пла́ть<strong>и</strong>це, кре́сл<strong>и</strong>це</em>).
            </div>

            {/* -ИЧК- / -ЕЧК- & -ИНК- / -ЕНК- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                • 3. -ИЧК- / -ЕЧК- & 4. -ИНК- / -ЕНК-
              </div>
              • <strong>-ичк-:</strong> в сущ. от слов на <em>-ица</em> (<em>умн<strong>ичк</strong>а ← умн<strong>иц</strong>а, пугов<strong>ичк</strong>а ← пугов<strong>иц</strong>а</em>).<br />
              • <strong>-ечк-:</strong> в остальных (<em>утр<strong>ечк</strong>о, сем<strong>ечк</strong>о, сит<strong>ечк</strong>о, врем<strong>ечк</strong>о, Ван<strong>ечк</strong>а</em>).<br />
              • <strong>-инк-:</strong> от слов на <em>-ина</em> (<em>завал<strong>инк</strong>а ← завал<strong>ин</strong>а, бисер<strong>инк</strong>а</em>).<br />
              • <strong>-енк-:</strong> в уменьшительных (<em>виш<strong>енк</strong>а, баш<strong>енк</strong>а, пес<strong>енк</strong>а</em>).
              <div className="mt-1 text-[11px] p-1.5 rounded-lg text-rose-700 bg-rose-50 border border-rose-200">
                <strong>⛔ ИСКЛЮЧЕНИЯ:</strong> <em>нищ<strong>енк</strong>а, неж<strong>енк</strong>а, монаш<strong>енк</strong>а, француз<strong>енк</strong>а</em>.
              </div>
            </div>

            {/* -ИНСТВ- / -ЕНСТВ- & -ЧИК- / -ЩИК- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                • 5. -ИНСТВ- / -ЕНСТВ- & 6. -ЧИК- / -ЩИК-
              </div>
              • <strong>-инств- / -енств-:</strong> уд. на окончание → <strong>-инств-</strong> (<em>большинств<strong>о́</strong>, меньшинств<strong>о́</strong></em>); уд. НЕ на окончание → <strong>-енств-</strong> (<em>пе́рв<strong>енств</strong>о</em>).<br />
              • <strong>-чик- / -щик-:</strong> лицо по роду занятий.<br />
              <div className="my-1 text-[11px] p-1 rounded font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200">
                ⭐ После <strong>Д, Т, З, С, Ж</strong> («Зоя ждёт...») → пиши <strong>-чик-</strong> (<em>перевод<strong>чик</strong>, лёт<strong>чик</strong>, разнос<strong>чик</strong>, перебеж<strong>чик</strong></em>).
              </div>
              После остальных согласных → <strong>-щик-</strong> (<em>паром<strong>щик</strong>, фонар<strong>щик</strong>, камен<strong>щик</strong></em>).
            </div>

            {/* 7. НЕИЗМЕНЯЕМЫЕ СУФФИКСЫ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                • 7. Неизменяемые суффиксы сущ.
              </div>
              <div className="mb-1 text-[11px] p-1 rounded font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200">
                ⭐ «Всегда выбираем <strong>И (О)</strong>, кроме <em>-ет, -ест, -еств, -евин</em>»
              </div>
              • <strong>«и»:</strong> <em>-изн-, -ин-, -ник-, -ниц-, -овин-</em> (<em>бел<strong>изн</strong>а, тиш<strong>ин</strong>а, настав<strong>ник</strong>, воспитатель<strong>ниц</strong>а, диков<strong>инк</strong>а</em>).<br />
              • <strong>«о»:</strong> <em>-отн-, -овн-, -от-, -ост-</em> (<em>бег<strong>отн</strong>я, болт<strong>овн</strong>я, быстр<strong>от</strong>а, трудн<strong>ост</strong>ь</em>).<br />
              • <strong>«е»:</strong> <em>нищ<strong>ет</strong>а, торж<strong>еств</strong>о, студ<strong>енчеств</strong>о, человеч<strong>еств</strong>о, горд<strong>ость</strong></em>.<br />
              • <strong>Кулинарные:</strong> <em>ва́р<strong>ев</strong>о, жар<strong>ев</strong>о, мес<strong>ив</strong>о, круж<strong>ев</strong>о, топл<strong>ив</strong>о</em>.
            </div>

            {/* 8. -ЁР-, 9. ШИПЯЩИЕ И 10. -ОНЬК-/-ЕНЬК- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                • 8. -ЁР-, 9. Шипящие и 10. -ОНЬК- / -ЕНЬК-
              </div>
              • <strong>-ёр-:</strong> всегда «ё» после шипящих (ж, ч, ш, щ): <em>стаж<strong>ёр</strong>, дириж<strong>ёр</strong>, режисс<strong>ёр</strong>, монтаж<strong>ёр</strong></em> (искл.: <em>маж<strong>ор</strong></em>).<br />
              • <strong>Шипящие и Ц:</strong> под уд. в суфф. <em>-ок, -онок, -овк</em> → пиши <strong>О</strong> (<em>нож<strong>о́вк</strong>а, мелоч<strong>о́вк</strong>а, медвед<strong>о́нок</strong>, крюч<strong>о́к</strong></em>). В отглагольных сущ. <em>-ёвк-, -ёнка</em> → <strong>Ё</strong> (<em>туш<strong>ёвк</strong>а, ноч<strong>ёвк</strong>а, сгущ<strong>ёнк</strong>а</em>).<br />
              • <strong>-оньк- / -еньк-:</strong> после твёрдых согл. → <strong>-оньк-</strong> (<em>берёз<strong>оньк</strong>а, лис<strong>оньк</strong>а</em>); после мягких, шипящих и гласных → <strong>-еньк-</strong> (<em>доч<strong>еньк</strong>а, полос<strong>ыньк</strong>а, реч<strong>еньк</strong>а</em>).
            </div>
          </div>
        </div>

        {/* 2. СУФФИКСЫ ГЛАГОЛОВ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              2. Суффиксы глаголов • ОВА/ЕВА vs ЫВА/ИВА & Ударный -ВА-
            </div>
            <BadgeTag label="ГЛАГОЛЫ" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* ШАГ 1: ФОРМА «Я» */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                • ШАГ 1. ФОРМА 1 ЛИЦА ЕД. Ч. («Я»)
              </div>
              • Если на <strong>-ую / -юю</strong> → пиши <strong>-ова- / -ева-</strong> (<em>бесед<strong>ую</strong> → бесед<strong>ова</strong>ть, ноч<strong>ую</strong> → ноч<strong>ева</strong>ть, совет<strong>ую</strong> → совет<strong>ова</strong>ть, команд<strong>ую</strong> → команд<strong>ова</strong>ть</em>).<br />
              • Если на <strong>-ываю / -иваю</strong> → пиши <strong>-ыва- / -ива-</strong> (<em>рассматр<strong>иваю</strong> → рассматр<strong>ива</strong>ть, расс<strong>еиваю</strong> → расс<strong>еива</strong>ть, разгляд<strong>ываю</strong> → разгляд<strong>ыва</strong>ть</em>).
            </div>

            {/* ШАГ 2: УДАРНЫЙ -ВА- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                • ШАГ 2. УДАРНЫЙ -ВА- & -ЁВЫВА-
              </div>
              • <strong>Ударный -ВА-:</strong> отбрось <strong>-ВА-</strong> → пишется гласная основы того же вида:<br />
              <em>повелева́ть → повеле́ть, запечатлева́ть → запечатле́ть, преодолева́ть → преодоле́ть, запева́ть → запе́ть, согрева́ть → согре́ть, залива́ть → зали́ть</em>.<br />
              • <strong>Суффикс -ёвыва-:</strong> всегда пишется «ё» (<em>выкорч<strong>ёвыва</strong>ть, затуш<strong>ёвыва</strong>ть</em>).
            </div>

            {/* ПЕРЕХОДНОСТЬ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-orange)' }}>
                • Переходность действия
              </div>
              <div className="mb-1 text-[11px] p-1 rounded font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                ⭐ «Ведр<strong>о́</strong> проржав<strong>е́</strong>ло»
              </div>
              • <strong>Непереходный (сам субъект) → -е-:</strong> <em>ведро проржав<strong>е</strong>ло, улица обезлюд<strong>е</strong>ла [сама], обессил<strong>е</strong>л от усталости, лед оледен<strong>е</strong>л</em>.<br />
              • <strong>Переходный (над кем-то) → -и-:</strong> <em>враги обезлюд<strong>и</strong>ли улицу, болезнь обессил<strong>и</strong>ла меня, мороз оледен<strong>и</strong>л реки</em>.
            </div>

            {/* ВСЕ ИСКЛЮЧЕНИЯ ГЛАГОЛОВ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                • Все исключения глаголов из тетради
              </div>
              1. <strong>Искл. на ударный -ВАТЬ:</strong> <em>затмева́ть, застрева́ть, разева́ть, продлева́ть, увещева́ть, встрева́ть, намерева́ться, сомнева́ться, обурева́ть (+ подразумева́ть, недоумева́ть)</em>.<br />
              2. <strong>Инфинитивы для запоминания:</strong> <em>вы́здороветь (выздоровеет, выздоровеют), пле́сневеть, воро́чать, опроти́веть (опроти́веет), черви́веть</em>.
            </div>
          </div>
        </div>

        {/* 3. СУФФИКСЫ ПРИЛАГАТЕЛЬНЫХ И НАРЕЧИЙ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              3. Суффиксы прилагательных и наречий (Правило ОКНО)
            </div>
            <BadgeTag label="ПРИЛ. И НАРЕЧИЯ" tone="green" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>-ИВ- / -ЕВ-:</strong> под уд. <strong>-ив-</strong> (<em>краси́вый, лени́вый, правди́вый</em>), без уд. <strong>-ев-</strong> (<em>ма́рлевый, сире́невый, ключево́й, фасо́левый, со́евый</em>).<br />
              <div className="my-1 text-[11px] p-1 rounded font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                ⭐ <strong>Искл.:</strong> <em>ми́лостивый, юро́дивый</em> (пиши <strong>И</strong>!).
              </div>
              • <strong>-ЧИВ- / -ЛИВ-:</strong> всегда пишется только <strong>И</strong> (<em>доверч<strong>ив</strong>ый, заботл<strong>ив</strong>ый, обидч<strong>ив</strong>ый, совестл<strong>ив</strong>ый, непоседл<strong>ив</strong>ый, застенч<strong>ив</strong>ый, опрометч<strong>ив</strong>ый</em>).<br />
              <TrapBox title="⚡ ЛОВУШКА В КОРНЕ">
                <em>эма́л<strong>ев</strong>ый</em> (корень эмаль), <em>гуттапе́рч<strong>ев</strong>ый</em> (корень гуттаперч) — суффикс <strong>-ЕВ-</strong> без ударения!
              </TrapBox>
              • <strong>-К- / -СК-:</strong><br />
              — <strong>-К-:</strong> есть краткая форма (<em>низкий → низок, узкий → узок</em>) или после согласных <em>К, Ц, Ч</em> (<em>немецкий ← немец, ткацкий ← ткач, казацкий ← казак</em>).<br />
              — <strong>-СК-:</strong> нет краткой формы (<em>французский, матросский, кавказский</em>). Искл.: <em>узбекский, таджикский</em>.<br />
              ⭐ «Гоняю на коньках»: <em>одесский, черкасский</em> (сохраняется С корня).
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>«ЧАТ АИСТОВ»:</strong> <em>-чат-</em> (<em>ступен<strong>чат</strong>ый, решет<strong>чат</strong>ый, дощ<strong>ат</strong>ый</em>); <em>-ист-</em> (<em>пород<strong>ист</strong>ый, глин<strong>ист</strong>ый</em>); <em>-ов-/-оват-/-овит-</em> (<em>делов<strong>ит</strong>ый, винов<strong>ат</strong>ый</em>).<br />
              • <strong>Пары со смыслом:</strong><br />
              — <em>ветр<strong>ен</strong>ый</em> (день, человек, ветреница) vs <em>безветр<strong>енн</strong>ый, подветр<strong>енн</strong>ый</em> (с приставкой 2 Н!);<br />
              — <em>ветр<strong>ян</strong>ой</em> (двигатель, мельница, оспа);<br />
              — <em>масл<strong>ен</strong>ый</em> (блин, каша, неделя, взгляд) vs <em>масл<strong>ян</strong>ый</em> (краски, насос, пятно).<br />
              • <strong>ПРАВИЛО «ОКНО» ДЛЯ НАРЕЧИЙ:</strong><br />
              — Приставки <strong>ИЗ-, ДО-, С-</strong> → суффикс <strong>-А</strong> (<em>издавн<strong>а</strong>, досух<strong>а</strong>, слев<strong>а</strong></em>). Подставь «окно»: из окна́, до окна́, с окна́.<br />
              — Приставки <strong>В-, НА-, ЗА-</strong> → суффикс <strong>-О</strong> (<em>вправ<strong>о</strong>, насух<strong>о</strong>, занов<strong>о</strong></em>). Подставь «окно»: в окно́, на окно́, за окно́.<br />
              <div className="mt-1 text-[11px] p-1.5 rounded-lg text-amber-800 bg-amber-50 border border-amber-200">
                <strong>⚡ ЛОВУШКА «ОКНА»:</strong> Если наречие образовано от прил. с суффиксом <em>-чив-/-лив-</em>, суффикс сохраняется: <em>доверч<strong>ив</strong>о</em> (от <em>доверчивый</em>)!
              </div>
            </div>
          </div>

          {/* СЛОВА ИЗ ЗАМЕТОК ТЕТРАДИ */}
          <div className="mt-2 p-2.5 rounded-xl text-[11.5px] leading-snug" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <span className="font-extrabold" style={{ color: 'var(--ios-purple)' }}>Слова из заметок и полей тетради (стр. 15, 19): </span>
            <em>владишка, сворачивать, недосмотреть, послать, просвещение, пуговичка, затмевать, безголосый, рассада, развернуть, умница, намереваться, проходящий, причудливый, угодливый, наставничество, устаревать, взимающий, предыстория, безымянный, платьице, пришёптывать, лелеять, сеять, веять</em>.
          </div>
        </div>
      </>
    ),
  },
  {
    task: '12',
    title: '12 · ЛИЧНЫЕ ОКОНЧАНИЯ И СУФФИКСЫ ПРИЧАСТИЙ',
    pages: 'Стр. 20–25, 59',
    accentVar: 'var(--ios-green)',
    softVar: 'var(--ios-green-soft)',
    keywords:
      'целую милая спряжение брить стелить зиждиться зыбиться гнать держать дышать слышать смотреть видеть ненавидеть терпеть вертеть обидеть зависеть сеять веять реять таять лаять каяться маять надеяться лелеять затеять чуять чаять блеять кашлять кланяться драить клеить мучить мерить строить помнить покоить ворочать молоть мелить догнать догонять вы ущ ющ ащ ящ ем ом им вш ш л нн н застреленный расстрелянный вывалянный вываленный выкачанная выкаченная провешанные провешенные замешанное замешанный навешанное навешанная пристрелянное пристреленный движимый',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-green-soft)',
            border: '0.5px solid rgba(48, 209, 88, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-green)' }}>
            ⚡ ГЛАВНЫЙ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Определи время слова!</strong> Прошедшее время (-вш-, -ш-, -л-, -нн-) → <strong>по инфинитиву 1-в-1</strong>, спряжение НЕ нужно! Настоящее/будущее время → нужно спряжение!<br />
            2. <strong>Проверь ударение личного окончания!</strong> Если ударное (<em>сп<strong>и́</strong>шь, гор<strong>и́</strong>шь</em>), инфинитив не проверяем — пишем слышимую букву!<br />
            3. <strong>Для безударных: определи спряжение по инфинитиву</strong> (I спр. «цЕлУЮ» или II спр. «мИлАЯ»).
          </div>
        </div>

        {/* 1. ТАБЛИЦА СПРЯЖЕНИЙ: I СПР. («цЕлУЮ») VS II СПР. («мИлАЯ») */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-green)' }}>
              1. Спряжение глаголов • I спр. («цЕлУЮ») vs II спр. («мИлАЯ»)
            </div>
            <BadgeTag label="СПРЯЖЕНИЯ" tone="green" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* I СПРЯЖЕНИЕ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between gap-1 mb-1 font-bold" style={{ color: 'var(--ios-blue)' }}>
                <span>I СПРЯЖЕНИЕ («цЕлУЮ»: гласные Е, У, Ю)</span>
                <BadgeTag label="-ешь / -ут, -ют" tone="blue" />
              </div>
              • <strong>Все глаголы НЕ на -ить:</strong> на <em>-ать, -еть, -ять, -оть, -уть, -ти, -чь</em> (<em>танцевать, гулять, крикнуть, закоченеть</em>).<br />
              • <strong>4 исключения на -ИТЬ:</strong> <em>брить, стелить, зиждиться, зыбиться</em>.<br />
              → Формы: <em>бре́<strong>е</strong>шь / бре́<strong>ю</strong>т; сте́л<strong>е</strong>шь / сте́л<strong>ю</strong>т; зи́жд<strong>е</strong>тся / зи́жд<strong>у</strong>тся; зы́бл<strong>е</strong>тся</em>.<br />
              • <strong>Глаголы на -ЯТЬ (запомни наизусть):</strong><br />
              <em>се́ять, ве́ять, ре́ять, та́ять, ла́ять, ка́яться, ма́яться, наде́яться, леле́ять, зате́ять, чу́ять, ча́ять, бле́ять, ка́шлять, кла́няться</em>.
            </div>

            {/* II СПРЯЖЕНИЕ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between gap-1 mb-1 font-bold text-rose-700">
                <span>II СПРЯЖЕНИЕ («мИлАЯ»: гласные И, А, Я)</span>
                <BadgeTag label="-ишь / -ат, -ят" tone="red" />
              </div>
              • <strong>Все глаголы на -ИТЬ (кроме 4 искл.):</strong> <em>водить, пилить, клеить, строить, драить, мучить, мерить, помнить, покоить</em>.<br />
              • <strong>11 исключений (НЕ на -ить):</strong><br />
              — <strong>4 на -ать:</strong> <em>гнать, держать, дышать, слышать</em>.<br />
              — <strong>7 на -еть:</strong> <em>смотреть, видеть, ненавидеть, терпеть, вертеть, обидеть, зависеть</em>.<br />
              → Формы: <em>ды́ш<strong>и</strong>шь / ды́ш<strong>а</strong>т; смо́тр<strong>и</strong>шь / смо́тр<strong>я</strong>т; го́н<strong>и</strong>шь / го́н<strong>я</strong>т</em>.<br />
              <div className="mt-1 text-[11px] p-1.5 rounded-lg text-rose-700 bg-rose-50 border border-rose-200">
                <strong>! У II спр. суффикс не сохраняется:</strong> кле́ить → кле́<strong>я</strong>т (НЕ <s>клеют</s>!), дра́ить → дра́<strong>я</strong>т!
              </div>
            </div>
          </div>

          {/* ОБРАЗЦЫ СПРЯЖЕНИЙ & КАПКАНЫ */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] leading-snug">
            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong style={{ color: 'var(--ios-green)' }}>Образцы спряжений (стр. 21):</strong><br />
              <strong>I спряжение:</strong> махать (маш<strong>е</strong>шь, маш<strong>у</strong>т), скучать (скуча́<strong>е</strong>шь, скуча́<strong>ю</strong>т), лаять (ла́<strong>е</strong>шь, ла́<strong>ю</strong>т), стелить (сте́л<strong>е</strong>шь, сте́л<strong>ю</strong>т).<br />
              <strong>II спряжение:</strong> разделить (раздел<strong>и</strong>шь, раздел<strong>я</strong>т), мучить (му́ч<strong>и</strong>шь, му́ч<strong>а</strong>т), гнать (го́н<strong>и</strong>шь, го́н<strong>я</strong>т), клеить (кле́<strong>и</strong>шь, кле́<strong>я</strong>т).
            </div>

            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong style={{ color: 'var(--ios-orange)' }}>⚡ Капканы с приставками и омонимами:</strong><br />
              • <strong>молоть</strong> (зерно): I спр. → <em>ме́л<strong>е</strong>шь, ме́л<strong>ю</strong>т</em>.<br />
              • <strong>мелить</strong> (мелом): II спр. → <em>мел<strong>и́</strong>шь, мел<strong>я́</strong>т</em>.<br />
              • <strong>догнать</strong> (сов. в., искл. II спр.) → <em>дого́н<strong>и</strong>шь, дого́н<strong>я</strong>т</em> vs <strong>догонять</strong> (несов. в., I спр. на -ять) → <em>догоня́<strong>е</strong>шь, догоня́<strong>ю</strong>т</em>.<br />
              • <strong>Приставка ВЫ-</strong> перетягивает ударение! Отбрось её, чтобы увидеть ударное окончание: <em>вы́спишься → спи́шь (II спр.)</em>.
            </div>
          </div>
        </div>

        {/* 2. ПРИЧАСТИЯ НАСТОЯЩЕГО ВРЕМЕНИ (ПО СПРЯЖЕНИЮ) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-green)' }}>
              2. Причастия настоящего времени • Строго по спряжению («целую, милая»)
            </div>
            <BadgeTag label="НАСТ. ВРЕМЯ" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                ДЕЙСТВИТЕЛЬНЫЕ ПРИЧАСТИЯ
              </div>
              • <strong>I спр. → -УЩ- / -ЮЩ-:</strong><br />
              <em>шептать → ше́пч<strong>ущ</strong>ий, сеять → се́<strong>ющ</strong>ий, таять → та́<strong>ющ</strong>ий, стелить → сте́л<strong>ющ</strong>ий, бороться → бо́р<strong>ющ</strong>ийся</em>.<br />
              • <strong>II спр. → -АЩ- / -ЯЩ-:</strong><br />
              <em>лечить → ле́ч<strong>ащ</strong>ий, дышать → ды́ш<strong>ащ</strong>ий, гнать → го́н<strong>ящ</strong>ий, клеить → кле́<strong>ящ</strong>ий, зависеть → зави́с<strong>ящ</strong>ий</em>.
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-green)' }}>
                СТРАДАТЕЛЬНЫЕ ПРИЧАСТИЯ
              </div>
              • <strong>I спр. → -ЕМ- / -ОМ-:</strong><br />
              <em>читать → чита́<strong>ем</strong>ый, колебать → коле́бл<strong>ем</strong>ый, вести → вед<strong>о́м</strong>ый</em>.<br />
              • <strong>II спр. → -ИМ-:</strong><br />
              <em>видеть → ви́д<strong>им</strong>ый, слышать → слы́ш<strong>им</strong>ый, клеить → кле́<strong>им</strong>ый, зависеть → зави́с<strong>им</strong>ый</em>.<br />
              <div className="mt-1 p-1.5 rounded-lg text-amber-800 bg-amber-50 border border-amber-200">
                ⭐ <strong>ИСКЛЮЧЕНИЕ:</strong> <em>дви́ж<strong>им</strong>ый</em> (образовано от устаревшего глагола <em>движити</em> II спр.!).
              </div>
            </div>
          </div>
        </div>

        {/* 3. ПРИЧАСТИЯ ПРОШЕДШЕГО ВРЕМЕНИ (ПО ИНФИНИТИВУ 1-В-1) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-green)' }}>
              3. Причастия прошедшего времени • По инфинитиву 1-в-1 (Спряжение НЕ нужно!)
            </div>
            <BadgeTag label="ПРОШ. ВРЕМЯ" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-orange)' }}>
                ПЕРЕД -ВШ-, -Ш-, -Л- (1-в-1 БЕЗ ИЗМЕНЕНИЙ)
              </div>
              Гласная инфинитива сохраняется в точности:<br />
              • <em>пове́<strong>я</strong>ть → пове́<strong>я</strong>вший</em><br />
              • <em>раста́<strong>я</strong>ть → раста́<strong>я</strong>вший</em><br />
              • <em>кле́<strong>и</strong>ть → кле́<strong>и</strong>вший</em><br />
              • <em>уви́д<strong>е</strong>ть → уви́д<strong>е</strong>вший</em><br />
              • <em>оби́д<strong>е</strong>ть → оби́д<strong>е</strong>вший</em><br />
              • <em>леле́<strong>я</strong>ть → леле́<strong>я</strong>вший</em>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-red)' }}>
                ПЕРЕД -НН- / -Н- (СТРАДАТЕЛЬНЫЕ ПРОШ. ВР.)
              </div>
              • на <strong>-АТЬ → -АНН-:</strong> <em>услы́ш<strong>а</strong>ть → услы́ш<strong>анн</strong>ый, напис<strong>а</strong>ть → напис<strong>анн</strong>ый</em>.<br />
              • на <strong>-ЯТЬ → -ЯНН-:</strong> <em>посе́<strong>я</strong>ть → посе́<strong>янн</strong>ый, разве́<strong>я</strong>ть → разве́<strong>янн</strong>ый</em>.<br />
              • на <strong>-ИТЬ / -ЕТЬ → -ЕНН-:</strong> <em>постро́<strong>и</strong>ть → постро́<strong>енн</strong>ый, скле́<strong>и</strong>ть → скле́<strong>енн</strong>ый, оби́д<strong>е</strong>ть → оби́ж<strong>енн</strong>ый</em>.<br />
              <TrapBox title="⛔ СТРОГИЙ ЗАПРЕТ">
                В суффиксах страдательных причастий <strong>НИКОГДА НЕ БЫВАЕТ БУКВЫ «И» (-ИНН-)</strong>! Только <strong>-ЕНН-</strong>!
              </TrapBox>
            </div>
          </div>

          {/* СМЫСЛОВЫЕ ПАРЫ ПРИЧАСТИЙ */}
          <div className="mt-2 p-2.5 rounded-xl text-[11.5px] leading-snug" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div className="font-extrabold mb-1" style={{ color: 'var(--ios-green)' }}>
              ⚡ Капканы ЕГЭ: Смысловые пары причастий (тетрадь стр. 25, 59):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div>• <strong>застрелЕННый</strong> (← застрел<em>ить</em> -ить → -енн-) / <strong>расстрелЯННый</strong> (← расстрел<em>ять</em> -ять → -янн-)</div>
              <div>• <strong>вывалЯННый</strong> в грязи (← вывал<em>ять</em>) / <strong>вывалЕННый</strong> мусор (← вывал<em>ить</em>)</div>
              <div>• <strong>выкачАННая</strong> нефть (← выкач<em>ать</em>) / <strong>выкачЕННая</strong> бочка (← выкат<em>ить</em>)</div>
              <div>• <strong>провешАННые</strong> флажки (← провеш<em>ать</em>) / <strong>провешЕННые</strong> продукты (← провес<em>ить</em>)</div>
              <div>• <strong>замешАННое</strong> тесто (← замес<em>ить</em> → -енн-) / <strong>замешАННый</strong> в деле (← замеш<em>ать</em>)</div>
              <div>• <strong>пристрелЯННое</strong> ружьё (← пристрел<em>ять</em>) / <strong>пристрелЕННый</strong> зверь (← пристрел<em>ить</em>)</div>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '13',
    title: '13 · СЛИТНОЕ И РАЗДЕЛЬНОЕ НЕ/НИ',
    pages: 'Стр. 26–28',
    accentVar: 'var(--ios-teal)',
    softVar: 'var(--ios-teal-soft)',
    keywords:
      'не ни слитно раздельно без не не употребляется синоним противопоставление а вовсе далеко отнюдь ничуть нисколько краткие причастия зависимое слово глагол деепричастие числительное местоимение не рад не жаль не должен не готов не намерен не обязан не склонен недо не до недоедать недосмотреть не доел несмотря на невзирая на не смотря ни о чем ни у кого ничтожный никто никогда нигде',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-teal-soft)',
            border: '0.5px solid rgba(48, 176, 199, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-teal)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Проверь часть речи:</strong> глагол, деепричастие, краткое причастие, числительное → <strong>всегда раздельно</strong> (кроме без НЕ-).<br />
            2. <strong>Для причастий:</strong> ищи <em>зависимое слово</em> или <em>противопоставление с «А»</em> → раздельно! Нет их → слитно.<br />
            3. <strong>Для прил./сущ./наречий на -О:</strong> ищи «магниты» (<em>вовсе не, далеко не, отнюдь не, ничуть не</em>) или противопоставление с «А» → раздельно! Синоним без НЕ → слитно.
          </div>
        </div>

        {/* 1. СЛИТНО VS РАЗДЕЛЬНО (14 ПРАВИЛ) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-teal)' }}>
              1. Слитно и раздельно с НЕ (14 ключевых правил из тетради)
            </div>
            <BadgeTag label="СЛИТНО / РАЗДЕЛЬНО" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* СЛИТНО */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                СЛИТНО С «НЕ» (1 СЛОВО)
              </div>
              • <strong>1. Без НЕ не употребляется:</strong> <em>неряха, ненавидеть, недоумевающий, невзрачный</em>.<br />
              • <strong>2. Синоним без НЕ:</strong> сущ., прил., наречия на -О/Е (<em>неправда = ложь, неглупый = умный, неплохо = хорошо</em>).<br />
              • <strong>3. Отриц. местоимения/наречия без предлога:</strong> <em>некого, нечто, негде, некогда, незачем</em>.<br />
              • <strong>4. Полные причастия БЕЗ зависимых слов:</strong> <em>непрочитанная книга, нескошенная трава, нерешённая задача</em>.<br />
              • <strong>5. На -МЫЙ со словами степени (весьма, крайне, совершенно):</strong> <em>крайне необдуманный, совершенно неподходящий</em>.<br />
              • <strong>6. Приставка НЕДО- (неполнота нормы):</strong> <em>хронически недоедать, недосмотреть за ребёнком</em>.
            </div>

            {/* РАЗДЕЛЬНО */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                РАЗДЕЛЬНО С «НЕ» (2–3 СЛОВА)
              </div>
              • <strong>7. С глаголами, деепричастиями, краткими причастиями:</strong> <em>не был, не зная, задача не решена</em>.<br />
              • <strong>8. Противопоставление с союзом А:</strong> <em>не правда, а ложь; не глубокая, а мелкая река</em>.<br />
              <div className="text-[11px] p-1 rounded font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 my-0.5">
                ! Союз <strong>НО</strong> не разделяет: <em>неглубокая, но холодная река</em> (слитно!).
              </div>
              • <strong>9. Слова-магниты:</strong> <em>далеко не, вовсе не, отнюдь не, ничуть не, нисколько не, никому не</em>.<br />
              • <strong>10. Полные причастия С зависимыми словами:</strong> <em>ещё не прочитанная книга, не скошенная вовремя трава</em>.<br />
              • <strong>11. С числительными и служебными словами:</strong> <em>не раз, не два, не один, не то... не то, не только</em>.
            </div>
          </div>

          {/* КРАТКИЕ СКАЗУЕМЫЕ & НЕДО/НЕ ДО */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] leading-snug">
            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                11–12. Краткие сказуемые (стр. 28):
              </div>
              Краткие прил., не имеющие полной формы или не употребляющиеся в ней (всегда раздельно!):<br />
              <strong>не рад, не жаль, не должен, не готов, не намерен, не обязан, не склонен</strong>.
            </div>

            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-teal)' }}>
                13. НЕДО- vs НЕ ДО- (стр. 28):
              </div>
              • <strong>НЕДО- слитно:</strong> действие ниже нормы, неполнота (<em>дети в войну недоедали; няня недосмотрела за ребёнком</em>).<br />
              • <strong>НЕ ДО- раздельно:</strong> действие не доведено до конца (<em>он не доел суп; фильм не досмотрел до конца</em>).
            </div>
          </div>

          {/* НЕСМОТРЯ НА VS НЕ СМОТРЯ */}
          <div className="mt-2 p-2.5 rounded-xl text-[12px] leading-snug" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div className="font-extrabold mb-1" style={{ color: 'var(--ios-teal)' }}>
              14. Несмотря на vs Не смотря (стр. 28):
            </div>
            • <strong>Несмотря на / невзирая на</strong> (производный предлог = <em>вопреки</em>) → <strong>СЛИТНО</strong>:<br />
            <em>Несмотря на зимний мороз, детишки выбежали играть во двор</em>.<br />
            • <strong>Не смотря</strong> (деепричастие = <em>не глядя физически глазами</em>) → <strong>РАЗДЕЛЬНО</strong>:<br />
            <em>Он шёл вперёд, не смотря по сторонам</em>.
          </div>
        </div>

        {/* 2. ПРАВОПИСАНИЕ НИ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-teal)' }}>
              2. Правописание частицы и приставки НИ
            </div>
            <BadgeTag label="ПРАВИЛО В 3 СЛОВА" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>1. Без «НИ» не употребляется (слитно):</strong> <em>ничтожный, ничейный</em>.<br />
              • <strong>2. В отрицательных местоимениях и наречиях (слитно):</strong> <em>никто́, ничего́, неотку́да, никако́й, нигде́, никогда́</em>.
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>3. Раздельно (во всех остальных случаях):</strong><br />
              — С сущ. и местоимениями: <em>ни крошки, ни ты, ни вправо</em>.<br />
              — <strong>С предлогом (правило «в 3 слова»):</strong> <em>ни о чём, ни у кого, ни с кем, ни перед чем, ни для кого</em>!
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '14',
    title: '14 · СЛИТНО, ДЕФИС, РАЗДЕЛЬНО',
    pages: 'Стр. 29–38',
    accentVar: 'var(--ios-orange)',
    softVar: 'var(--ios-orange-soft)',
    keywords:
      'в течение в продолжение вследствие наподобие ввиду насчет вроде вместо несмотря на из-за из-под иметь в виду в виде в связи с в силу чтобы тоже также зато причем притом итак то есть пол полу пол-лимона давным-давно точь-в-точь по-новому по-моему бок о бок с глазу на глаз натощак невпопад вдребезги наверх внизу вперед назад ввысь вглубь вдаль ввек сначала без ведома без оглядки в обнимку в упор под утро до упаду как будто если бы алфавитный словарь наречий',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-orange-soft)',
            border: '0.5px solid rgba(255, 149, 0, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-orange)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Определи часть речи:</strong> производный предлог, союз, наречие или существительное с предлогом.<br />
            2. <strong>Для союзов:</strong> проверь замену на синоним (<em>чтобы = с целью</em>, <em>тоже/также = И</em>, <em>зато = но</em>). Если частицу (<em>бы, же</em>) можно убрать или переставить — пиши <strong>раздельно</strong>!<br />
            3. <strong>Для предлогов и наречий:</strong> проверь букву на конце (<em>в течениЕ, по прибытиИ</em>), наличие зависимого слова (<em>в глубь леса</em> vs <em>вглубь</em>) или дефис по правилам (<em>по-...-ому, то-либо-нибудь, пол-</em>).
          </div>
        </div>

        {/* 1. ПРОИЗВОДНЫЕ ПРЕДЛОГИ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-orange)' }}>
              1. Производные предлоги (стр. 29–31)
            </div>
            <BadgeTag label="ПРЕДЛОГИ" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* СЛИТНО */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                СЛИТНО (ПРЕДЛОГИ)
              </div>
              • <strong>вследствие</strong> (= из-за: <em>вследствие дождя</em>)<br />
              • <strong>наподобие</strong> (= вроде: <em>наподобие шара</em>)<br />
              • <strong>ввиду</strong> (= из-за: <em>ввиду болезни</em>)<br />
              • <strong>насчёт</strong> (= о: <em>договориться насчёт экскурсии</em>)<br />
              • <strong>вроде</strong> (= как: <em>что-то вроде бабочки</em>)<br />
              • <strong>вместо</strong> (= взамен: <em>вместо меня</em>)<br />
              • <strong>несмотря на / невзирая на</strong> (= вопреки)
              <TrapBox title="⚡ ЛОВУШКА В СУЩЕСТВИТЕЛЬНЫХ">
                • <em>в следстви<strong>и</strong> по делу</em> (сущ. + предлог)<br />
                • <em>в вид<strong>у</strong> города</em> (около, вблизи)
              </TrapBox>
            </div>

            {/* РАЗДЕЛЬНО & ДЕФИС */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                РАЗДЕЛЬНО (БУКВА «Е» НА КОНЦЕ!)
              </div>
              • <strong>в течениЕ</strong> (дня, года, урока)<br />
              • <strong>в продолжениЕ</strong> (месяца, разговора)<br />
              • <strong>в заключениЕ</strong> (статьи, речи)<br />
              • <strong>в изменениЕ</strong> (расписания)<br />
              • <strong>по прибытиИ, по окончаниИ, по завершениИ</strong> (на -И в значении «после»!)<br />
              • <strong>Через дефис:</strong> <em>из-за, из-под, по-над, по-за</em>.
              <div className="mt-1 text-[11px] p-1.5 rounded-lg text-amber-900 bg-amber-50 border border-amber-200">
                ⭐ <strong>Устойчивые сочетания:</strong> <em>иметь в виду</em> (в 3 слова!), <em>в виде, в связи с, в силу, в отличие от, в целях</em>.
              </div>
            </div>
          </div>
        </div>

        {/* 2. СОЮЗЫ VS ОМОНИМЫ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-orange)' }}>
              2. Союзы vs Омонимичные сочетания (стр. 31–33)
            </div>
            <BadgeTag label="СОЮЗЫ" tone="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>ЧТОБЫ (= с целью, для того чтобы):</strong><br />
              — <em>Слитно:</em> Пришёл, <strong>чтобы</strong> помочь («бы» нельзя убрать!).<br />
              — <em>Раздельно:</em> <strong>Что бы</strong> такое почитать? («бы» можно переставить: <em>Что такое почитать бы?</em>).<br />
              • <strong>ТОЖЕ, ТАКЖЕ (= И, союз присоединения):</strong><br />
              — <em>Слитно:</em> Я <strong>тоже</strong> приду (= И я приду). Вася любит чай, а <strong>также</strong> пирог.<br />
              — <em>Раздельно:</em> То <strong>же</strong> самое слово («же» убирается: <em>то слово</em>); сделал так <strong>же</strong>, как вчера (наречие «так» + «же»).
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>ЗАТО (= НО, противительный):</strong><br />
              — <em>Слитно:</em> Подъём крутой, <strong>зато</strong> красивый (= но).<br />
              — <em>Раздельно:</em> Спрятался <strong>за то</strong> дерево (указательное местоимение «то» с предлогом «за»).<br />
              • <strong>ПРИЧЁМ, ПРИТОМ (= к тому же, вместе с тем):</strong><br />
              — <em>Слитно:</em> Он умный, <strong>притом</strong> скромный.<br />
              — <em>Раздельно:</em> <strong>При чём</strong> тут я? Ни <strong>при чём</strong>.<br />
              • <strong>ИТАК (= следовательно, вводное слово):</strong><br />
              — <em>Слитно:</em> <strong>Итак</strong>, подведём итоги.<br />
              — <em>Раздельно:</em> <strong>И так</strong> продолжалось три года.
            </div>
          </div>
        </div>

        {/* 3. НАРЕЧИЯ: ДЕФИС, СЛИТНО, РАЗДЕЛЬНО */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-orange)' }}>
              3. Наречия • Дефис, слитные группы и раздельные сочетания (стр. 33–37)
            </div>
            <BadgeTag label="НАРЕЧИЯ" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* ДЕФИС В НАРЕЧИЯХ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-orange)' }}>
                НАРЕЧИЯ ЧЕРЕЗ ДЕФИС & ЧАСТИЦЫ
              </div>
              • <strong>ПО- + -ОМУ, -ЕМУ, -КИ, -НИ, -ЬИ:</strong> <em>по-новому, по-моему, по-русски, по-птичьи</em>.<br />
              • <strong>В- / ВО- + -ЫХ, -ИХ:</strong> <em>во-первых, в-третьих</em>.<br />
              • <strong>Суффиксы:</strong> <em>-то, -либо, -нибудь</em>, приставка <em>кое-</em> (<em>где-то, куда-либо, как-нибудь, кое-как</em>).<br />
              • <strong>Частица -ТАКИ:</strong> через дефис после глаголов, наречий и частиц (<em>пришёл-таки, опять-таки, всё-таки</em>). Во всех остальных — раздельно: <em>он таки пришёл</em>.<br />
              • <strong>Повторы:</strong> <em>еле-еле, чуть-чуть, крест-накрест, точь-в-точь</em>.
            </div>

            {/* СЛИТНЫЕ И РАЗДЕЛЬНЫЕ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                СЛИТНЫЕ VS РАЗДЕЛЬНЫЕ НАРЕЧИЯ
              </div>
              • <strong>Без предлога не употребляются:</strong> <em>натощак, невпопад, вдребезги, спозаранку, втихомолку, наотмашь, исподлобья</em>.<br />
              • <strong>Пространство/время БЕЗ завис. слов (слитно):</strong> <em>наверх, внизу, вперёд, назад, ввысь, вглубь, вдаль, ввек, сначала</em>.<br />
              <div className="text-[11px] p-1 rounded font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 my-1">
                ! С зависимым словом раздельно: <em>в глубь океана, в начале урока</em>!
              </div>
              • <strong>Раздельные наречные сочетания:</strong> <em>в обнимку, в упор, без оглядки, под утро, до упаду, бок о бок, с глазу на глаз, след в след</em>.<br />
              • <strong>ПОЛ- («— Л Я М»):</strong> через дефис перед <strong>Л</strong> (<em>пол-лимона</em>), <strong>Заглавной</strong> (<em>пол-Москвы</em>), <strong>Гласной</strong> (<em>пол-яблока</em>). Слитно: <em>полчаса, полдома</em>. ПОЛУ- всегда слитно: <em>полукруг</em>.
            </div>
          </div>
        </div>

        {/* 4. АЛФАВИТНЫЙ СЛОВАРЬ НАРЕЧИЙ (120+ СЛОВ) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-orange)' }}>
              4. Полный алфавитный словарь наречий из тетради (120+ слов)
            </div>
            <BadgeTag label="АЛФАВИТНЫЙ СПИСОК" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                СЛИТНО (А–Я):
              </div>
              <em>авторитетно, бесследно, вбок, ввек, вверху, вволю, вовек, вовеки, воедино, вокруг, вообще, воочию, вослед, впервые, вперебой, вперевалку, вперегиб, вперемежку, вперемешку, вплавь, вполголоса, впопыхах, впору, вразброд, вразрез, врасплох, вровень, вслепую, всмятку, втайне, въявь, добела, дотла, доверху, донизу, досуха, докрасна, донага, запанибрата, заподлицо, заправило, засим, засветло, затем, искони, исподлобья, исподтишка, исстари, кряду, набок, навзничь, навзрыд, навсегда, наглухо, наготове, надвое, назавтра, назло, наискосок, накануне, наконец, налево, налицо, намного, наотмашь, наперевес, наперебой, наперерез, напролёт, напролом, напрямую, нарасхват, насквозь, насмарку, наспех, насухо, наугад, наудачу, наутёк, начеку, наяву, невдогад, невзначай, невмочь, невпопад, невтерпёж, оземь, опрометью, освояси, побоку, повсюду, подчистую, понаслышке, поодиночке, поперёк, пополам, посередине, поутру, сбоку, свысока, сгоряча, слева, слишком, снаружи, сначала, спереди, справа, сродни, сряду, чересчур</em>.
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                РАЗДЕЛЬНО (А–Я):
              </div>
              <em>без ведома, без запроса, без оглядки, без просвета, без разбора, без толку, без удержу, без устали, бок о бок, в виде, в заключение, в знак, в корне, в миг, в насмешку, в ногу, в обмен, в обнимку, в обрез, в обтяжку, в общем, в одиночку, в открытую, в прах, в придачу, в продолжение, в противовес, в пух и прах, в рассрочку, в розницу, в связи с, в силу, в сердце, в складчину, в срок, в струнку, в течение, в тиши, в тупик, в упор, в ходе, взад и вперёд, время от времени, всё равно, где бы то ни было, день ото дня, до востребования, до зарезу, до крайности, до неузнаваемости, до отвала, до свидания, до смерти, до упаду, друг за другом, за глаза, за границу, за полночь, из года в год, из-под носа, как будто, как бы то ни было, как раз, мал мала меньше, на авось, на бегу, на вес золота, на весу, на виду, на вкус, на время, на глаз, на диво, на днях, на дом, на дыбы, на зависть, на износ, на исходе, на лету, на миг, на ощупь, на пару, на память, на плаву, на попятную, на поруки, на прокат, на радостях, на редкость, на руку, на рысях, на скаку, на славу, на смех, на сносях, на совесть, на страже, на убой, на убыль, на ура, на ход ноги, на ходу, на цыпочках, на часах, не к добру, не к лицу, не к спеху, не под силу, не по душе, не по нутру, не по плечу, ни за что, ни на шаг, ни свет ни заря, один на один, от мала до велика, ото дня ко дню, плечом к плечу, по душе, по зарез, по латыни, по очереди, по праву, под боком, под вечер, под конец, под силу, под стать, под утро, под шумок, рука об руку, с ведома, с виду, с годами, с испугу, с концами, с лёгкой руки, с маху, с налёта, с нуля, с панталыку, с плеча, с разбегу, с размаху, с роздыху, с ходу, само собой, след в след, со зла, слово в слово, тем не менее, точка в точку, то и дело, час от часу, честь честью</em>.
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '15',
    title: '15 · ПРАВОПИСАНИЕ Н И НН',
    pages: 'Стр. 39–41, 86',
    accentVar: 'var(--ios-pink)',
    softVar: 'var(--ios-pink-soft)',
    keywords:
      'н нн отыменные суффиксы ан ян ин онн енн искл стеклянный оловянный деревянный ветреный безветренный первообразные юный синий пряный рьяный вороной бараний свиной фазаний тюлений отглагольные 4 условия приставка ова ева зависимое слово совершенный вид раненый смышленый кованый жеваный клеваный ухоженный невиданный неслыханный нежданный негаданный нечаянный желанный священный чванный медленный чеканный краткие причастия избалованы избалованны воспитана воспитанна нефтяник песчаник путаник ветреник труженик вареник именинник пленник посланник современник бешено путано искренне медленно',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-pink-soft)',
            border: '0.5px solid rgba(255, 45, 85, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-pink)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Определи часть речи:</strong> отымённое прилагательное (от сущ.), отглагольное слово (причастие/прил.), краткая форма, наречие или существительное.<br />
            2. <strong>Для отымённых:</strong> суффиксы <em>-АН-, -ЯН-, -ИН-</em> (<strong>1 Н</strong>, искл.: <em>стеклянный, оловянный, деревянный</em>) vs <em>-ЕНН-, -ОНН-</em> или <em>стык Н+Н</em> (<strong>2 НН</strong>, искл.: <em>ветреный</em>).<br />
            3. <strong>Для отглагольных:</strong> проверь 4 условия НН (приставка, <em>-ова-/-ева-</em>, зависимое слово, соверш. вид). Если есть хоть одно → <strong>2 НН</strong>; нет ни одного → <strong>1 Н</strong>. В кратких причастиях — <strong>ВСЕГДА 1 Н</strong>!
          </div>
        </div>

        {/* 1. ОТЫМЁННЫЕ ПРИЛАГАТЕЛЬНЫЕ (ОТ СУЩЕСТВИТЕЛЬНЫХ) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-pink)' }}>
              1. Отымённые прилагательные • Суффиксы и основа (стр. 39)
            </div>
            <BadgeTag label="ОТ СУЩЕСТВИТЕЛЬНЫХ" tone="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* ОДНА БУКВА Н */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                ОДНА БУКВА «Н»
              </div>
              • <strong>Суффиксы -АН-, -ЯН-, -ИН-:</strong> <em>песч<strong>ан</strong>ый, глин<strong>ян</strong>ый, серебр<strong>ян</strong>ый, соловь<strong>ин</strong>ый, лебед<strong>ин</strong>ый</em>.<br />
              <div className="my-1 text-[11px] p-1.5 rounded-lg text-rose-700 bg-rose-50 border border-rose-200">
                <strong>⛔ ИСКЛЮЧЕНИЯ с 2 НН:</strong> <em>стекл<strong>янн</strong>ый, олов<strong>янн</strong>ый, дерев<strong>янн</strong>ый</em>.
              </div>
              • <strong>Первообразные (без суффикса, Н в корне):</strong> <em>юный, синий, пряный, рьяный, румяный, багряный, зелёный, вороной</em>.<br />
              • <strong>Притяжательные (чей? суффикс -ИЙ):</strong> <em>свиной, бараний, фазаний, тюлений, павлиний, кабаний</em>.
            </div>

            {/* ДВЕ БУКВЫ НН */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                ДВЕ БУКВЫ «НН»
              </div>
              • <strong>Стык основы на Н + суффикс Н:</strong> <em>карман<strong>н</strong>ый (карман+н), сон<strong>н</strong>ый, осен<strong>н</strong>ий, картин<strong>н</strong>ый, старин<strong>н</strong>ый (старина+н), целин<strong>н</strong>ый</em>.<br />
              • <strong>Суффиксы -ЕНН-, -ОНН-:</strong> <em>утр<strong>енн</strong>ий, торжеств<strong>енн</strong>ый, авиаци<strong>онн</strong>ый, традици<strong>онн</strong>ый, солом<strong>енн</strong>ый, плам<strong>енн</strong>ый</em>.<br />
              <div className="my-1 text-[11px] p-1.5 rounded-lg text-amber-900 bg-amber-50 border border-amber-200">
                ⭐ <strong>ИСКЛЮЧЕНИЕ:</strong> <em>ветр<strong>ен</strong>ый</em> (человек, день). Но с приставкой: <em>безветр<strong>енн</strong>ый, подветр<strong>енн</strong>ый</em> (2 НН!).
              </div>
            </div>
          </div>
        </div>

        {/* 2. ОТГЛАГОЛЬНЫЕ ПРИЛАГАТЕЛЬНЫЕ И ПРИЧАСТИЯ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-pink)' }}>
              2. Отглагольные прилагательные и причастия • 4 условия 2 НН (стр. 40)
            </div>
            <BadgeTag label="ОТ ГЛАГОЛОВ" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* 4 УСЛОВИЯ НН */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                4 УСЛОВИЯ ДЛЯ 2 НН (ХОТЯ БЫ ОДНО!):
              </div>
              1. <strong>Приставка (кроме НЕ-):</strong> <em><strong>по</strong>крашенный, <strong>пере</strong>жаренный, <strong>про</strong>читанный</em>.<br />
              2. <strong>Суффиксы -ОВА-, -ЕВА-, -ИРОВА-:</strong> <em>бал<strong>ова</strong>нный, марин<strong>ова</strong>нный, асфальт<strong>ирова</strong>нный</em>.<br />
              <div className="text-[11px] p-1 rounded font-bold bg-rose-50 border border-rose-200 text-rose-800 my-0.5">
                ⛔ Ловушка: <em>кованый, жеваный, клеваный</em> (-ов-/-ев- в корне, 1 Н!).
              </div>
              3. <strong>Зависимое слово (причастный оборот):</strong> <em>жаре<strong>нн</strong>ый на масле карась, вяза<strong>нн</strong>ый бабушкой шарф</em>.<br />
              4. <strong>Совершенный вид (что сделать?):</strong> <em>решё<strong>нн</strong>ый (решить сов. в.), купле<strong>нн</strong>ый (купить)</em>.
            </div>

            {/* 1 Н И ИСКЛЮЧЕНИЯ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                1 Н (НЕТ 4 УСЛОВИЙ) & ИСКЛЮЧЕНИЯ
              </div>
              • <strong>Отглагольные прил. (несов. в., без приставки и завис. слов):</strong> <em>варёный, жареный, сушёный, мороженый, рваный, вяленый, печёный, стриженый, мощёный</em>.<br />
              • <strong>Исключения с 1 Н:</strong> <em>ра́неный (но: израненный; раненный в ногу — с завис. словом 2 НН!), смышлёный ребёнок, названый брат, посажёный отец, с приданым</em>.<br />
              • <strong>Исключения с 2 НН (запомни наизусть):</strong> <em>ухоженный, приверженный, невиданный, нечаянный, неслыханный, нежданный, негаданный, желанный, священный, чванный, медленный, чеканный, считанный, обещанный, деланный, доморощенный, лелеянный</em>.
            </div>
          </div>
        </div>

        {/* 3. КРАТКИЕ ФОРМЫ, СУЩЕСТВИТЕЛЬНЫЕ И НАРЕЧИЯ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-pink)' }}>
              3. Краткие формы (1 Н vs 2 НН), существительные и наречия (стр. 41, 86)
            </div>
            <BadgeTag label="КРАТКИЕ & НАРЕЧИЯ" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* КРАТКИЕ ПРИЧАСТИЯ VS ПРИЛАГАТЕЛЬНЫЕ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-pink)' }}>
                КРАТКИЕ ПРИЧАСТИЯ (1 Н) VS ПРИЛ. (2 НН)
              </div>
              • <strong>Краткие причастия — ВСЕГДА 1 Н</strong> (<em>что сделано?</em>): <em>книга прочита<strong>н</strong>а, задача реше<strong>н</strong>а, дети избалова<strong>н</strong>ы судьбой</em>.<br />
              • <strong>Краткие прил. — столько Н, сколько в полной:</strong> <em>девочка умна и воспита<strong>нн</strong>а (воспитанная), манеры изыска<strong>нн</strong>ы, движения скова<strong>нн</strong>ы</em>.<br />
              <div className="mt-1 text-[11px] p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200">
                <strong>Пары омонимов:</strong><br />
                • собрание организова<strong>н</strong>о директором (прич.) / она умна и организова<strong>нн</strong>а (прил.)<br />
                • войска сосредоточе<strong>н</strong>ы на границе (прич.) / лица бойцов сосредоточе<strong>нн</strong>ы (прил.)
              </div>
            </div>

            {/* СУЩЕСТВИТЕЛЬНЫЕ И НАРЕЧИЯ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                СУЩЕСТВИТЕЛЬНЫЕ И НАРЕЧИЯ
              </div>
              Сохраняют ровно столько букв «Н», сколько было в производящей основе!<br />
              • <strong>1 Н:</strong> <em>нефтя<strong>н</strong>ик (нефтяной), песча<strong>н</strong>ик (песчаный), пута<strong>н</strong>ик (путаный), ветре<strong>н</strong>ик (ветреный), труже<strong>н</strong>ик, варе<strong>н</strong>ик, конопля<strong>н</strong>ик</em>.<br />
              • <strong>2 НН:</strong> <em>именин<strong>н</strong>ик (именинный), плен<strong>н</strong>ик (пленный), послан<strong>н</strong>ик, воспитан<strong>н</strong>ик, современ<strong>н</strong>ик</em>.<br />
              • <strong>Наречия на -О:</strong> <em>беше<strong>н</strong>о мчаться (бешеный 1 Н), пута<strong>н</strong>о объяснять (путаный 1 Н), искрен<strong>н</strong>е благодарен (искренний 2 Н), медлен<strong>н</strong>о идти (медленный 2 Н)</em>.
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '16',
    title: '16 · ПУНКТУАЦИЯ В ССП И ОЧП',
    pages: 'Стр. 42–45',
    accentVar: 'var(--ios-cyan)',
    softVar: 'var(--ios-cyan-soft)',
    keywords:
      'однородные члены предложения ссп сочинительные союзы и да или либо ни ни как так и не только но и не столько сколько хотя и но овч общий второстепенный член общее вводное общая придаточная часть два вопросительных восклицательных побудительных неоднородные определения капкан причастный оборот правило n-1 фразеологизмы ни то ни се и день и ночь',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-cyan-soft)',
            border: '0.5px solid rgba(50, 173, 230, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-cyan)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Подчеркни грамматические основы:</strong> простое предложение с ОЧП (одна основа) или ССП (две основы с союзом И, ДА=И, ИЛИ).<br />
            2. <strong>Для ОЧП:</strong> проверь союзы (одиночный, повторяющийся, двойной), попарные группы, правило N-1 и фразеологизмы.<br />
            3. <strong>Для ССП:</strong> в базе запятая перед И ставится! Проверь, нет ли <strong>4 общих элементов</strong> (ОВЧ, придаточная часть, вводное слово, общий вопрос/восклицание). Если есть — запятая НЕ ставится!
          </div>
        </div>

        {/* 1. ОДНОРОДНЫЕ ЧЛЕНЫ ПРЕДЛОЖЕНИЯ (ОЧП) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-cyan)' }}>
              1. Однородные члены предложения (ОЧП) • Союзы и схемы
            </div>
            <BadgeTag label="ОЧП" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* СТАВИТСЯ ЗАПЯТАЯ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                СТАВИТСЯ ЗАПЯТАЯ ПРИ ОЧП:
              </div>
              • <strong>Бессоюзная связь:</strong> <em>[ О, О, О ]</em>.<br />
              • <strong>Противительные союзы (а, но, да=но, зато, однако):</strong> <em>[ О, а О ]</em>; <em>[ О, но О ]</em>.<br />
              • <strong>Повторяющиеся союзы (и...и, ни...ни, то...то):</strong><br />
              <em>[ и О, и О ]</em> • <em>[ О, и О, и О ]</em> (правило N-1: запятая перед каждым союзом «и», начиная со второго ОЧП!).<br />
              • <strong>Двойные сопоставительные союзы:</strong><br />
              — <em>как О, так и О</em><br />
              — <em>не только О, но и О</em><br />
              — <em>не столько О, сколько О</em><br />
              — <em>хотя и О, но О</em><br />
              (запятая ставится <strong>строго перед второй частью союза</strong>!).<br />
              • <strong>Попарное объединение:</strong> <em>[ (О и О), (О и О) ]</em>.
            </div>

            {/* НЕ СТАВИТСЯ ЗАПЯТАЯ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                НЕ СТАВИТСЯ ЗАПЯТАЯ ПРИ ОЧП:
              </div>
              • <strong>Одиночный соединительный / разделительный союз:</strong> <em>[ О и О ]</em>; <em>[ О да=и О ]</em>; <em>[ О или О ]</em>; <em>[ О либо О ]</em>.<br />
              <TrapBox title="⛔ ФРАЗЕОЛОГИЗМЫ (БЕЗ ЗАПЯТЫХ)">
                Устойчивые неделимые обороты с повторяющимися союзами: <em>ни то ни сё, и день и ночь, ни жив ни мёртв, ни свет ни заря, и смех и грех, ни слуху ни духу, ни рыба ни мясо, и так и эдак</em>!
              </TrapBox>
              • <strong>Неоднородные определения:</strong> характеризуют предмет с РАЗНЫХ сторон (размер + цвет + материал). Запятая <strong>НЕ ставится</strong>: <em>старый деревянный дом; большой круглый дубовый стол</em>.
            </div>
          </div>

          {/* КАПКАН: ПРИЛАГАТЕЛЬНОЕ + ПРИЧАСТНЫЙ ОБОРОТ */}
          <div className="mt-2 p-2.5 rounded-xl text-[12px] leading-snug" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div className="font-extrabold mb-1 text-amber-700">
              ⚡ Капкан: Одиночное прилагательное + Причастный оборот
            </div>
            • <strong>Случай 1:</strong> <em>[ один. прил. , | ПО | Х ]</em> → <strong>СТАВИТСЯ запятая!</strong><br />
            Пример: <em>Мы выезжаем на длинную, | окружённую соснами | поляну</em>.<br />
            • <strong>Случай 2:</strong> <em>[ | ПО | один. прил. Х ]</em> → <strong>НЕ СТАВИТСЯ запятая!</strong><br />
            Пример: <em>Мы выезжаем на | окружённую соснами | длинную поляну</em>.
          </div>
        </div>

        {/* 2. ССП И 4 СЛУЧАЯ БЕЗ ЗАПЯТОЙ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-cyan)' }}>
              2. Сложносочинённое предложение (ССП) • 4 исключения БЕЗ запятой
            </div>
            <BadgeTag label="ССП И ОВЧ" tone="orange" />
          </div>

          <div className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>Базовое правило ССП:</strong> между частями сложносочинённого предложения перед союзом И <strong>ставится запятая</strong>: <em>[ Гроза прошла ] , и [ выглянуло солнце ]</em>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] leading-snug">
            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                1. Общий второстепенный член (ОВЧ):
              </div>
              Стоит в начале предложения и относится к ОБЕИМ грамматическим основам:<br />
              <em>[После выслушанных новостей] Николай придаёт лицу строгое выражение и у нас начинается жаркий спор</em>.
            </div>

            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                2. Общая придаточная часть:
              </div>
              Относится сразу к обеим главным частям ССП:<br />
              <em>[Когда Пётр ехал через рощу], гремел гром и деревья шумели и гнулись от ветра</em> (оба действия происходили, когда он ехал).
            </div>

            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                3. Общее вводное слово / сочетание:
              </div>
              Вводное слово относится к обеим частям:<br />
              <em>[К счастью], это начисто забылось и осталась только прелесть той жизни</em>.<br />
              <em>[По словам очевидцев], пламя быстро погасло и угрозы не возникло</em>.
            </div>

            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                4. Общая вопросит. / восклиц. интонация:
              </div>
              Два вопросительных, восклицательных или побудительных предложения:<br />
              <em>[Кто виноват] и [что делать]?</em><br />
              <em>[Как тихо кругом] и [как сладко дышится в лесу]!</em><br />
              <em>[Подпустить врага ближе] и [огонь дать по моей команде]!</em>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '17',
    title: '17 · ОБОСОБЛЕННЫЕ ЧЛЕНЫ ПРЕДЛОЖЕНИЯ',
    pages: 'Стр. 46–48',
    accentVar: 'var(--ios-blue)',
    softVar: 'var(--ios-blue-soft)',
    keywords:
      'обособленные члены предложения причастный оборот деепричастный оборот по до приложение определяемое слово личное местоимение обстоятельственное значение уступка причина дистантное расположение фразеологизмы сломя голову затаив дыхание не покладая рук не смыкая глаз характеристика лица приложение тире как в качестве будучи',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-blue-soft)',
            border: '0.5px solid rgba(10, 132, 255, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-blue)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Найди оборот и определяемое слово (Х):</strong> причастный оборот (ПО), деепричастный (ДО) или приложение.<br />
            2. <strong>Для деепричастного оборота (ДО):</strong> выделяется <strong>ВСЕГДА</strong> (кроме неделимых фразеологизмов: <em>сломя голову, не покладая рук</em>).<br />
            3. <strong>Для причастного оборота (ПО):</strong> стоит ПОСЛЕ слова Х → <strong>обособляется</strong>; стоит ДО слова Х → <strong>НЕ обособляется</strong>, КРОМЕ 3 исключений (личное местоимение, причина/уступка, оторвано дистантно)!
          </div>
        </div>

        {/* 1. ПРИЧАСТНЫЕ ОБОРОТЫ И ОПРЕДЕЛЕНИЯ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              1. Причастные обороты (ПО) и определения (стр. 46–47)
            </div>
            <BadgeTag label="ПО" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* БАЗОВАЯ ПОЗИЦИЯ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                БАЗОВАЯ ПОЗИЦИЯ ПО
              </div>
              • <strong>После определяемого слова Х (обособляется):</strong><br />
              <em>[ Х , | ПО | , ... ]</em> → <em>Катер , | разрезавший волны | , подошёл к пирсу</em>.<br />
              • <strong>До определяемого слова Х (НЕ обособляется):</strong><br />
              <em>[ | ПО | Х ... ]</em> → <em>| Разрезавший волны | катер подошёл к пирсу</em>.<br />
              • <strong>Однородные обороты с одиночным союзом И:</strong><br />
              <em>[ Х , | ПО 1 | и | ПО 2 | , ... ]</em> → между ними перед «И» запятая <strong>НЕ ставится</strong>!
            </div>

            {/* 3 ИСКЛЮЧЕНИЯ ДЛЯ ПО ДО «Х» */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1 text-rose-700">
                ⭐ 3 ИСКЛЮЧЕНИЯ: ПО СТОИТ «ДО», НО ОБОСОБЛЯЕТСЯ!
              </div>
              1. <strong>Относится к личному местоимению:</strong><br />
              <em>| Усталая и бледная | , она медленно вошла в комнату</em>.<br />
              2. <strong>Добавочное обстоятельственное значение (причина / уступка):</strong><br />
              <em>| Охваченный жаром битвы | , боец не чувствовал боли</em> (почему? так как был охвачен).<br />
              3. <strong>Дистантное расположение (оторван от Х):</strong><br />
              <em>| Увлечённые весёлой игрой | , на поляну шумно выбежали дети</em>.
            </div>
          </div>
        </div>

        {/* 2. ДЕЕПРИЧАСТИЯ И ДЕЕПРИЧАСТНЫЕ ОБОРОТЫ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              2. Деепричастия и деепричастные обороты (ДО) (стр. 47–48)
            </div>
            <BadgeTag label="ДО" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-orange)' }}>
                ОБОСОБЛЯЮТСЯ ВСЕГДА
              </div>
              • Деепричастие и ДО выделяются запятыми <strong>ВСЕГДА</strong>, независимо от места в предложении (в начале, середине или конце):<br />
              <em>| Прочитав книгу | , он задумался</em>.<br />
              <em>Он , | прочитав книгу | , задумался</em>.<br />
              • Однородные ДО с союзом И: <em>[ , | ДО 1 | и | ДО 2 | , ]</em> → перед «И» запятая <strong>НЕ ставится</strong>!
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <TrapBox title="⛔ ФРАЗЕОЛОГИЗМЫ (НЕ ОБОСОБЛЯЮТСЯ!)">
                Устойчивые фразеологические обороты тесно связаны со сказуемым и <strong>НЕ выделяются запятыми</strong>:<br />
                <em>бежал сломя голову, слушал затаив дыхание, работал не покладая рук, сидел сложа руки, трудился засучив рукава, не смыкая глаз, очертя голову, спустя рукава, слушать разинув рот</em>.
              </TrapBox>
            </div>
          </div>
        </div>

        {/* 3. ПРИЛОЖЕНИЯ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              3. Приложения • Характеристика, профессия и союз КАК
            </div>
            <BadgeTag label="ПРИЛОЖЕНИЯ" tone="purple" />
          </div>

          <div className="p-2.5 rounded-xl text-[12px] leading-snug" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            Приложение — определение, выраженное существительным. Отвечает на вопрос «кто именно такой? / что именно такое?».<br />
            • <strong>Характеристика лица / предмета (запятые или тире):</strong> <em>Иван Филиппов , [ основатель знаменитой булочной ] , был человеком строгих правил</em>.<br />
            • <strong>Профессия, звание, статус:</strong> <em>Это был старый переплётчик Эльяшев , [ родом из Николаева ] , виртуозный мастер</em>.<br />
            • <strong>Союз «КАК»:</strong><br />
            — В значении «в качестве кого-то» → <strong>НЕ обособляется:</strong> <em>Он известен как талантливый физик</em>.<br />
            — В значении причины (= <em>будучи</em>) → <strong>обособляется:</strong> <em>Илюша , как единственный сын в семье , был окружён безмерной заботой</em>.
          </div>
        </div>
      </>
    ),
  },
  {
    task: '18',
    title: '18 · ВВОДНЫЕ СЛОВА И ОБРАЩЕНИЯ',
    pages: 'Стр. 8–9',
    accentVar: 'var(--ios-purple)',
    softVar: 'var(--ios-purple-soft)',
    keywords:
      'вводные слова обращения уверенность неуверенность чувства источник порядок мыслей оценка стиля привлечение внимания никогда не вводные слова ведь вот вряд ли якобы даже исключительно именно как раз между тем словно якобы почти едва ли приблизительно авось буквально хамелеоны однако наконец значит кажется видно действительно естественно может быть частица о',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-purple-soft)',
            border: '0.5px solid rgba(175, 82, 222, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-purple)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Проверь грамматическую связь:</strong> к вводному слову <strong>нельзя задать вопрос</strong> от других членов предложения! Его можно изъять без потери структуры предложения.<br />
            2. <strong>Сверься со списком лже-вводных слов:</strong> слова <em>ведь, вот, даже, вряд ли, якобы, именно, между тем</em> <strong>никогда не бывают вводными</strong>!<br />
            3. <strong>Проверь слова-хамелеоны (однако, наконец, значит, кажется):</strong> вводные выделяются запятыми, члены предложения — нет!
          </div>
        </div>

        {/* 1. 8 РАЗРЯДОВ ВВОДНЫХ СЛОВ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              1. Основные смысловые группы вводных слов (выделяются запятыми!)
            </div>
            <BadgeTag label="8 ГРУПП" tone="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] leading-snug">
            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong style={{ color: 'var(--ios-blue)' }}>1. Уверенность:</strong> конечно, разумеется, несомненно, право, безусловно, бесспорно, естественно, действительно, как правило, само собой.<br />
              <strong style={{ color: 'var(--ios-indigo)' }}>2. Неуверенность:</strong> наверное, наверно, вероятно, кажется, видно, видимо, по-видимому, возможно, пожалуй, по всей вероятности.<br />
              <strong style={{ color: 'var(--ios-purple)' }}>3. Эмоции и чувства:</strong> к счастью, к несчастью, к сожалению, к удивлению, к огорчению, к радости, странное дело.<br />
              <strong style={{ color: 'var(--ios-teal)' }}>4. Источник сообщения:</strong> по-моему, по-твоему, по словам (кого-то), по сообщению, по мнению, по слухам, по преданию, с точки зрения, помнится.
            </div>

            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong style={{ color: 'var(--ios-orange)' }}>5. Порядок мыслей и связь речи:</strong> во-первых, во-вторых, в-третьих, значит, так, итак, следовательно, таким образом, напротив, наоборот, с одной стороны, с другой стороны, впрочем, кроме того, например, кстати, главное.<br />
              <strong style={{ color: 'var(--ios-green)' }}>6. Способ оформления мыслей:</strong> иными словами, короче говоря, так сказать, мягко выражаясь, прямо скажем, другими словами.<br />
              <strong style={{ color: 'var(--ios-pink)' }}>7. Призыв к собеседнику:</strong> пожалуйста, послушайте, представьте себе, поймите, поверьте, согласитесь.<br />
              <strong style={{ color: 'var(--ios-red)' }}>8. Оценка меры и степени:</strong> самое большее, по крайней мере, без преувеличения.
            </div>
          </div>
        </div>

        {/* 2. ЛОВУШКИ: СЛОВА, КОТОРЫЕ НИКОГДА НЕ БЫВАЮТ ВВОДНЫМИ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0 text-rose-700">
              2. ⛔ Ловушки ЕГЭ: слова, которые НИКОГДА не бывают вводными
            </div>
            <BadgeTag label="НЕ ВЫДЕЛЯЮТСЯ!" tone="red" />
          </div>

          <div className="p-2.5 rounded-xl text-[12px] leading-snug" style={{ background: 'var(--ios-red-soft)', color: 'var(--ios-label)' }}>
            Эти слова являются частицами или наречиями и <strong>НЕ ОБОСОБЛЯЮТСЯ ЗАПЯТЫМИ</strong>:<br />
            <strong>авось, буквально, будто, как будто, ведь, вдобавок, вдруг, в конечном счёте, вряд ли, едва ли, даже, исключительно, именно, как бы, как раз, между тем, почти, приблизительно, поистине, по решению, по указанию, просто, решительно, словно, якобы</strong>.
          </div>
        </div>

        {/* 3. СЛОВА-ХАМЕЛЕОНЫ И ОБРАЩЕНИЯ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              3. Слова-хамелеоны & Обращения
            </div>
            <BadgeTag label="ХАМЕЛЕОНЫ" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] leading-snug">
            {/* ХАМЕЛЕОНЫ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-orange)' }}>
                СЛОВА-ХАМЕЛЕОНЫ
              </div>
              • <strong>ОДНАКО:</strong> в начале предложения = союзу <strong>НО</strong> (запятая после него НЕ ставится: <em>Однако шторм утих</em>). В середине или конце предложения = вводное (<em>Он , однако , не пришёл</em>).<br />
              • <strong>НАКОНЕЦ:</strong> вводное при перечислении (= и ещё: <em>Мы промокли , устали и , наконец , заблудились</em>). Обстоятельство времени (= под конец: <em>Наконец поезд тронулся</em> — без запятых!).<br />
              • <strong>ЗНАЧИТ:</strong> вводное (= следовательно: <em>Ты , значит , передумал?</em>). Сказуемое (= означает: <em>Солнечное утро значит ясный день</em>).
            </div>

            {/* ОБРАЩЕНИЯ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                ПРАВИЛА ОБРАЩЕНИЙ
              </div>
              • <strong>Обращение всегда в Им. падеже</strong> и всегда обособляется запятыми:<br />
              <em>Здравствуй , дорогая мама !</em><br />
              • <strong>Местоимения ТЫ и ВЫ</strong> — НЕ являются обращениями (это подлежащие!):<br />
              <em>Ты помнишь, Алеша, дороги Смоленщины...</em> (обращение — только <em>Алеша</em>!).<br />
              • <strong>Частица О (только О) не отделяется от обращения запятой:</strong><br />
              <em>О сподвижники , о вас пройдёт молва!</em> (Междометия Ах, Ох, Эй отделяются: <em>Эй , откликнитесь!</em>).
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '19',
    title: '19 · ЗНАКИ ПРЕПИНАНИЯ В СПП',
    pages: 'Стр. 10–11',
    accentVar: 'var(--ios-indigo)',
    softVar: 'var(--ios-indigo-soft)',
    keywords:
      'спп сложноподчиненное предложение придаточная часть союз союзное слово который какой чей где куда откуда когда потому что так как стык союзов то но так смещение который однородные придаточные разрыв главного предложения изъяснительные определительные обстоятельственные присоединительные чек-лист',
    content: (
      <>
        {/* АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА */}
        <div
          className="p-2.5 rounded-xl mb-2 text-[12px] leading-snug"
          style={{
            background: 'var(--ios-indigo-soft)',
            border: '0.5px solid rgba(88, 86, 214, 0.28)',
            color: 'var(--ios-label)',
          }}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--ios-indigo)' }}>
            ⚡ АЛГОРИТМ РЕШЕНИЯ В 3 ШАГА
          </div>
          <div>
            1. <strong>Выдели все грамматические основы:</strong> найди главную часть [ ] и зависимые придаточные ( ).<br />
            2. <strong>Определи границы придаточных:</strong> запятая ставится на границе частей, а не строго перед союзным словом (помни о смещении слова <em>«который»</em>!).<br />
            3. <strong>Проверь опасные схемы:</strong> разрыв главной части придаточной, однородные придаточные с союзом И, стык союзов («ТО, НО, ТАК»).
          </div>
        </div>

        {/* 1. 5 СХЕМ СПП: ГЛАВНЫЕ ЛОВУШКИ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-indigo)' }}>
              1. Ключевые схемы СПП • Главные капканы экзамена
            </div>
            <BadgeTag label="СХЕМЫ СПП" tone="purple" />
          </div>

          <div className="space-y-2 text-[12px] leading-snug">
            {/* СХЕМА 1 */}
            <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20">
              <div className="font-extrabold text-amber-900 dark:text-amber-200 mb-1">
                ⚠️ СХЕМА 1 (Главная ловушка): Смещение слова «который» внутрь придаточного
              </div>
              Запятая ставится <strong>на ГРАНИЦЕ</strong> придаточной части, а <strong>НЕ</strong> перед словом «который»!<br />
              • <em>[ Мы подошли к старинному замку ] <strong>,</strong> ( фасад которого был украшен скульптурами )</em>.<br />
              • <em>[ Впереди показались вершины хребта ] <strong>,</strong> ( на склонах которых ещё лежал снег )</em>.<br />
              • <em>[ Нам показали старинные книги ] <strong>,</strong> ( в каждой из которых хранились редкие гравюры )</em>.
            </div>

            {/* СХЕМЫ 2 И 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
                <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                  • СХЕМА 2: Разрыв главной части
                </div>
                Придаточное разрывает главное предложение → выделяется <strong>ДВУМЯ запятыми</strong> (с обеих сторон):<br />
                <em>[ Деревня <strong>,</strong> ( в которой прошло моё детство ) <strong>,</strong> навсегда осталась в памяти ]</em>.
              </div>

              <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
                <div className="font-extrabold mb-1 text-emerald-700">
                  ⚡ СХЕМА 3: Однородные придаточные с И
                </div>
                Если два придаточных зависят от одной главной части и отвечают на один вопрос → перед одиночным союзом И <strong>запятая НЕ СТАВИТСЯ</strong>:<br />
                <em>[ Я помню ] <strong>,</strong> ( как мы бродили по лесу ) <strong>и</strong> ( как пели птицы на рассвете )</em>.
              </div>
            </div>

            {/* СХЕМЫ 4 И 5 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
                <div className="font-extrabold mb-1" style={{ color: 'var(--ios-indigo)' }}>
                  • СХЕМА 4: Составные союзы
                </div>
                <em>(потому что, так как, благодаря тому что, для того чтобы)</em>.<br />
                Расчленяются (запятая ставится внутри), если перед союзом есть отрицание НЕ, выделительные частицы (<em>только, лишь</em>) или вводное слово:<br />
                <em>[ Он пришёл только для того ] <strong>,</strong> ( чтобы предупредить нас )</em>.
              </div>

              <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
                <div className="font-extrabold mb-1 text-rose-700">
                  • СХЕМА 5: Стык союзов («ТО, НО, ТАК»)
                </div>
                Рядом два союза (<em>что если, и когда, что хотя</em>):<br />
                • Есть дальше <strong>ТО, НО, ТАК</strong> → запятая на стыке союзов <strong>НЕ СТАВИТСЯ</strong>!<br />
                <em>[ Он сказал ] , ( что ( если погода испортится ) , <strong>ТО</strong> поход отменится )</em>.<br />
                • НЕТ дальше «ТО, НО, ТАК» → запятая на стыке союзов <strong>СТАВИТСЯ</strong>!<br />
                <em>[ Он сказал ] , ( что <strong>,</strong> ( если погода испортится ) , поход отменится )</em>.
              </div>
            </div>
          </div>
        </div>

        {/* 2. 4 ВИДА ПРИДАТОЧНЫХ & ЧЕК-ЛИСТ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-indigo)' }}>
              2. 4 вида придаточных предложений & Финальный чек-лист №19
            </div>
            <BadgeTag label="ЧЕК-ЛИСТ №19" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] leading-snug">
            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong>1. Изъяснительные:</strong> вопросы косвенных падежей (кого? чего? о чём? что?). Союзы: <em>что, чтобы, как, будто, ли</em>.<br />
              <strong>2. Определительные:</strong> вопросы <em>какой? чей?</em> Союзные слова: <em>который, какой, чей, где, куда, откуда</em>.<br />
              <strong>3. Обстоятельственные:</strong> времени (когда?), места (где?), причины (почему?), цели (зачем?), условия, уступки.<br />
              <strong>4. Присоединительные:</strong> добавочные сведения (союзные слова: <em>что, отчего, почему, вследствие чего</em>).
            </div>

            <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-indigo)' }}>
                💡 Финальный чек-лист задания 19:
              </div>
              1) Выдели все грамматические основы предложения;<br />
              2) Проверь, не разрывает ли придаточная часть главную;<br />
              3) Проверь смещение слова «который» (запятая ставится на границе придаточного!);<br />
              4) Проверь, нет ли однородных придаточных с одиночным союзом И (перед И запятая не нужна!).
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '20',
    title: '20 · СЛОЖНЫЕ ПРЕДЛОЖЕНИЯ С РАЗНЫМИ ВИДАМИ СВЯЗИ (СТЫК СОЮЗОВ)',
    pages: 'Пунктуация',
    accentVar: 'var(--ios-green)',
    softVar: 'var(--ios-green-soft)',
    keywords: 'стык союзов что если что когда и если но когда то но так',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-green)' }}>
          Золотое правило стыка союзов «ТО, НО, ТАК» (№ 20)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-green-soft)' }}>
            <strong style={{ color: 'var(--ios-green)' }}>• Запятая на стыке союзов СТАВИТСЯ:</strong><br />
            Если после придаточного предложения <strong>НЕТ</strong> слов <strong>ТО, НО, ТАК</strong> (придаточное можно безболезненно вынуть из предложения).
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-orange-soft)' }}>
            <strong style={{ color: 'var(--ios-orange)' }}>• Запятая на стыке союзов НЕ ставится:</strong><br />
            Если дальше после придаточного <strong>ЕСТЬ</strong> коррелят <strong>ТО, НО</strong> или <strong>ТАК</strong> (<em>«Я знал, что (1) если приду, (2) ТО он поможет»</em> — на месте 1 запятой нет).
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '21',
    title: '21 · ПУНКТУАЦИОННЫЙ АНАЛИЗ ТЕКСТА (ТИРЕ, ДВОЕТОЧИЕ, ЗАПЯТАЯ)',
    pages: 'Анализ текста',
    accentVar: 'var(--ios-green)',
    softVar: 'var(--ios-green-soft)',
    keywords: 'тире двоеточие запятая подлежащее и сказуемое приложение бсп обобщающее слово прямая речь',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-green)' }}>
          Разграничение правил постановки тире, двоеточия и запятых (№ 21)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Причины постановки ТИРЕ (не смешивать!):</strong><br />
            1) Между подлежащим и сказуемым;<br />
            2) При обособленном приложении;<br />
            3) В бессоюзном сложном предложении (БСП);<br />
            4) Между однородными и обобщающим словом;<br />
            5) В неполном предложении (пропуск сказуемого);<br />
            6) При прямой речи / вставной конструкции.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Причины постановки ДВОЕТОЧИЯ:</strong><br />
            1) В БСП (причина, пояснение, дополнение);<br />
            2) После обобщающего слова перед однородными;<br />
            3) После слов автора перед прямой речью / цитатой.
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '22',
    title: '22 · ЯЗЫКОВЫЕ СРЕДСТВА ВЫРАЗИТЕЛЬНОСТИ (2 БАЛЛА)',
    pages: 'А Б В Г Д',
    accentVar: 'var(--ios-purple)',
    softVar: 'var(--ios-purple-soft)',
    keywords: 'эпитет метафора олицетворение сравнение гипербола литота метонимия анафора эпифора антитеза оксюморон парцелляция градация инверсия параллелизм аллитерация ассонанс',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-purple)' }}>
          Тропы, фигуры речи и звукопись (Задание № 22)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Тропы (образный перенос):</strong><br />
            • <strong>Эпитет</strong> — образное прилагательное/наречие (<em>малиновая улыбка, горькая доля</em>).<br />
            • <strong>Метафора</strong> — скрытое сравнение (<em>костёр рябины, море слёз</em>).<br />
            • <strong>Олицетворение</strong> — свойства живого у неживого (<em>спит земля, вьюга злилась</em>).<br />
            • <strong>Сравнение</strong> — с союзами <em>как, словно, точно, будто</em> или сущ. в Т.п.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Фигуры речи и звукопись:</strong><br />
            • <strong>Анафора</strong> — единоначатие; <strong>Эпифора</strong> — одинаковая концовка.<br />
            • <strong>Антитеза</strong> — противопоставление; <strong>Оксюморон</strong> — сочетание несочетаемого (<em>живой труп</em>).<br />
            • <strong>Парцелляция</strong> — разрыв предложения точками; <strong>Градация</strong> — нарастание.<br />
            • <strong>Аллитерация</strong> — повтор согласных; <strong>Ассонанс</strong> — повтор гласных.
          </div>
        </div>
      </div>
    ),
  },
];

export const CheatsheetModal: React.FC<CheatsheetModalProps> = React.memo(({
  isOpen,
  onClose,
  initialSection = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'all' | TaskId>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontScale, setFontScale] = useState(1);

  React.useEffect(() => {
    if (isOpen && initialSection) {
      setActiveTab(initialSection);
    }
  }, [isOpen, initialSection]);

  const resetViewportZoomOnBlur = () => {
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleSections = React.useMemo(
    () =>
      CHEAT_SECTIONS.filter((sec) => {
        const matchesTab = activeTab === 'all' || sec.task === activeTab;
        if (!matchesTab) return false;
        if (!normalizedQuery) return true;
        return (
          sec.title.toLowerCase().includes(normalizedQuery) ||
          sec.keywords.toLowerCase().includes(normalizedQuery)
        );
      }),
    [activeTab, normalizedQuery]
  );

  return (
    <SwipeableSheet
      id="rules-modal"
      sheetId="rules-sheet-panel"
      handleId="rules-drag-handle"
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Полный конспект-шпаргалка ЕГЭ 4–22"
      handleAriaLabel="Потяните вниз, чтобы закрыть шпаргалку"
      sheetClassName="ios-cheatsheet-panel ios-sheet-flush"
      sheetStyle={{ '--cheat-font-scale': fontScale } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="min-w-0 flex-1 pr-1">
          <h2 className="text-[18px] font-extrabold tracking-tight leading-tight whitespace-nowrap truncate">
            Конспект ЕГЭ 4–22
          </h2>
          <span
            className="block text-[11.5px] font-medium truncate whitespace-nowrap mt-0.5"
            style={{ color: 'var(--ios-label-sec)' }}
          >
            Все правила, запоминалки ⭐ и ловушки (задания 4–22)
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            id="cheat-font-dec"
            type="button"
            onClick={() => setFontScale((s) => Math.max(0.85, Number((s - 0.1).toFixed(2))))}
            className="liquid-pill-btn px-2.5 py-1 rounded-full text-[12.5px] font-bold cursor-pointer"
            aria-label="Уменьшить шрифт"
          >
            А−
          </button>
          <button
            id="cheat-font-inc"
            type="button"
            onClick={() => setFontScale((s) => Math.min(1.35, Number((s + 0.1).toFixed(2))))}
            className="liquid-pill-btn px-2.5 py-1 rounded-full text-[12.5px] font-bold cursor-pointer"
            aria-label="Увеличить шрифт"
          >
            А+
          </button>
          <button
            id="close-rules-modal"
            type="button"
            onClick={onClose}
            className="liquid-pill-btn px-3 py-1 rounded-full text-[13.5px] font-bold cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>

      <div className="mb-2 shrink-0">
        <input
          id="cheat-search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onBlur={resetViewportZoomOnBlur}
          placeholder="Поиск правила, запоминалки или слова (Фока, окно, звонит, полог)..."
          aria-label="Поиск правила, корня или слова-исключения"
          className="w-full px-3.5 py-2.5 rounded-2xl text-[16px] font-medium outline-none"
          style={{
            background: 'var(--ios-bg-secondary)',
            color: 'var(--ios-label)',
            border: '0.5px solid var(--ios-separator)',
          }}
        />
      </div>

      <div id="cheat-pills-scroll" className="mb-2.5 shrink-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className="px-3 py-1 rounded-full text-[11.5px] font-extrabold shrink-0 cursor-pointer transition-all"
          style={{
            background: activeTab === 'all' ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
            color: activeTab === 'all' ? '#FFFFFF' : 'var(--ios-label-sec)',
          }}
        >
          Все
        </button>
        {TASK_IDS.map((tId) => (
          <button
            key={tId}
            type="button"
            onClick={() => setActiveTab(tId)}
            className="px-2.5 py-1 rounded-full text-[11.5px] font-extrabold shrink-0 cursor-pointer transition-all"
            style={{
              background: activeTab === tId ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
              color: activeTab === tId ? '#FFFFFF' : 'var(--ios-label-sec)',
            }}
          >
            № {tId}
          </button>
        ))}
      </div>

      <div id="cheat-reader-body" className="cheat-reader">
        {visibleSections.length === 0 ? (
          <div className="cheat-card text-center py-8" style={{ color: 'var(--ios-label-sec)' }}>
            По запросу «{searchQuery}» разделов не найдено. Попробуйте ввести корень, запоминалку
            или номер задания.
          </div>
        ) : (
          <>
            {visibleSections.map((sec) => (
              <article key={sec.task} className="cheat-card" data-cheat-section={sec.task}>
                <div className="cheat-title">
                  <span style={{ color: sec.accentVar }}>{sec.title}</span>
                  <span className="text-[12px] font-medium" style={{ color: 'var(--ios-label-sec)' }}>
                    {sec.pages}
                  </span>
                </div>
                {sec.content}
              </article>
            ))}
          </>
        )}
      </div>
    </SwipeableSheet>
  );
});
