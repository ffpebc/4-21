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
    pages: 'стр. 2–13',
    accentVar: 'var(--ios-blue)',
    softVar: 'var(--ios-blue-soft)',
    keywords:
      'гар гор зар зор клан клон твар твор плав плов бер бир дер дир мер мир пер пир тер тир блест блист жег жиг стел стил чет чит кас кос лаг лож раст ращ рос скак скоч мак мок равн ровн пригарь выгарки изгарь утварь пловец пловчиха плывун сочетание чета побирушка розжиг полог слоговой росток вырост подростковый ростовщик отрасль ростов ростислав скачок скачу равнина равнение поравняться уровень поровну ровесник выровнять снять снимать понять понимать внять внимать сжать сжимать намять наминать опоздать поздний раскроить кройка развивается развевается увидать увядать полоскать поласкать благословлять прославлять разрядить разреженный посвятить просветить честолюбие крыжовник шорох шов капюшон трущоба мажорный шоссе шоколад шофер жокей жонглер ожог поджог циферблат панцирь цилиндр цыган на цыпочках цыпленок цыц кампания компания палисадник утрамбовать бюллетень жюри парашют брошюра корифей апелляция',
    content: (
      <>
        {/* 1. ЧЕРЕДУЮЩИЕСЯ КОРНИ • БАЗОВЫЙ УРОВЕНЬ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              1. Чередующиеся корни • Базовый уровень
            </div>
            <BadgeTag label="«ЗНАТЬ В ЛИЦО»" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* УДАРЕНИЕ */}
            <div
              className="p-2.5 rounded-xl text-[12px] leading-snug"
              style={{ background: 'var(--ios-bg-cell-hover)' }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <strong style={{ color: 'var(--ios-blue)' }}>• УДАРЕНИЕ</strong>
                <BadgeTag label="гар/гор, зар/зор" tone="orange" />
              </div>
              <div>
                • Без уд. <strong>О</strong>: <strong>гар/гор, клан/клон, твар/твор</strong> (
                <em>загорать, поклониться, творец</em>)
                <br />• Без уд. <strong>А</strong>: <strong>зар/зор</strong> (<em>заря́</em>, но{' '}
                <em>зо́рька</em>)
                <br />• <strong>плав/плов</strong>: всегда <strong>А</strong> (<em>плавучий</em>)
              </div>
            </div>

            {/* СУФФИКС -А- */}
            <div
              className="p-2.5 rounded-xl text-[12px] leading-snug"
              style={{ background: 'var(--ios-bg-cell-hover)' }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <strong style={{ color: 'var(--ios-blue)' }}>• СУФФИКС -А-</strong>
                <BadgeTag label="Есть -А- → И" tone="purple" />
              </div>
              <div>
                •{' '}
                <strong>
                  бер/бира, дер/дира, мер/мира, пер/пира, тер/тира, блест/блиста, жег/жига,
                  стел/стила, чет/чита
                </strong>
                <br />• <strong>кас(а) / кос</strong>: есть <em>-а-</em> → <em>касаться</em>, нет →{' '}
                <em>коснуться</em>
              </div>
            </div>

            {/* СОГЛАСНАЯ */}
            <div
              className="p-2.5 rounded-xl text-[12px] leading-snug"
              style={{ background: 'var(--ios-bg-cell-hover)' }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <strong style={{ color: 'var(--ios-blue)' }}>• СОГЛАСНАЯ</strong>
                <BadgeTag label="лаг/лож, раст/рос" tone="blue" />
              </div>
              <div>
                • <strong>лаг/лож</strong>: <em>полагать — положить</em>
                <br />• <strong>раст(ращ)/рос</strong>: <em>растение, выращенный — подросли</em>
                <br />• <strong>скак/скоч</strong>: <em>скакать — вскочить</em>
              </div>
            </div>

            {/* ЗНАЧЕНИЕ */}
            <div
              className="p-2.5 rounded-xl text-[12px] leading-snug"
              style={{ background: 'var(--ios-bg-cell-hover)' }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <strong style={{ color: 'var(--ios-blue)' }}>• ЗНАЧЕНИЕ</strong>
                <BadgeTag label="мак/мок, равн/ровн" tone="green" />
              </div>
              <div>
                • <strong>мак</strong> (погружать в жидк.: <em>макать</em>) / <strong>мок</strong>{' '}
                (пропускать: <em>непромокаемый</em>)
                <br />• <strong>равн</strong> (одинаковый: <em>сравнение</em>) /{' '}
                <strong>ровн</strong> (гладкий: <em>заровнять</em>)
              </div>
            </div>
          </div>
        </div>

        {/* 2. ИСКЛЮЧЕНИЯ ЧЕРЕДОВАНИЯ (СТР. 3) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-red)' }}>
              2. Исключения чередования (стр. 3)
            </div>
            <BadgeTag label="ПРОДВИНУТЫЙ УРОВЕНЬ" tone="red" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: 'var(--ios-red-soft)' }}
            >
              <div className="font-extrabold mb-0.5" style={{ color: 'var(--ios-red)' }}>
                Ударение / Плав:
              </div>
              <div>
                <em>при́гарь, вы́гарки, и́згарь, у́тварь; пловец, пловчиха, плывун</em> (+{' '}
                <em>зоревать</em>).
              </div>
              <div className="font-extrabold mt-1.5 mb-0.5" style={{ color: 'var(--ios-red)' }}>
                Суффикс -А-:
              </div>
              <div>
                <em>сочетание, чета, побирушка, розжиг</em>.
              </div>
            </div>

            <div
              className="p-2.5 rounded-xl"
              style={{ background: 'var(--ios-red-soft)' }}
            >
              <div className="font-extrabold mb-0.5" style={{ color: 'var(--ios-red)' }}>
                Конечная согласная:
              </div>
              <div>
                <em>
                  полог, слоговой; росток, на вырост, подростковый, ростовщик, отрасль, Ростов,
                  Ростислав; скачок, скачу
                </em>
                .
              </div>
              <div className="font-extrabold mt-1.5 mb-0.5" style={{ color: 'var(--ios-red)' }}>
                Значение (-равн-/-ровн-):
              </div>
              <div>
                <em>равнина, равнение, поравняться, уровень, поровну, ровесник, выровнять</em>.
              </div>
            </div>
          </div>

          <div
            className="mt-2 p-2.5 rounded-xl text-[12px]"
            style={{ background: 'var(--ios-purple-soft)' }}
          >
            <strong style={{ color: 'var(--ios-purple)' }}>
              Чередование а(я) / им(ин) (зависит от суффикса -А-):
            </strong>{' '}
            <em>
              снять — снимать, понять — понимать, внять — внимать, сжать — сжимать, намять —
              наминать
            </em>
            .
          </div>
        </div>

        {/* 3. ПРОВЕРЯЕМЫЕ КОРНИ • ЛОВУШКИ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-orange)' }}>
              3. Проверяемые корни • Ловушки (стр. 8–9)
            </div>
            <BadgeTag label="⛔ ЗАПРЕТ НА -ЫВАТЬ/-ИВАТЬ" tone="red" />
          </div>

          <div className="text-[12px] mb-1.5">
            <strong>Проверяем формой слова:</strong> <em>полоска́ть (поло́щет), гори́стый (го́ры)</em>.
          </div>

          <TrapBox title="⛔ ЗАПРЕТ НА ПРОВЕРКУ ГЛАГОЛАМИ НА -ЫВАТЬ / -ИВАТЬ">
            Гласную «О» нельзя проверять формами на <strong>-ывать/-ивать</strong>:{' '}
            <em>опоздать → по́здний</em> (НЕ <em>опа́здывать</em>!), <em>раскроить → кро́йка</em>.
          </TrapBox>

          <div className="text-[11px] font-extrabold uppercase tracking-wider mt-2 mb-1" style={{ color: 'var(--ios-blue)' }}>
            Смысловые пары корней (стр. 8–9):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[12px]">
            <div className="p-2 rounded-lg" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>развИвается</strong> (развитие) / <strong>развЕвается</strong> (веять)
              <br />• <strong>полОскать</strong> (полощет) / <strong>полАскать</strong> (ласка)
              <br />• <strong>разрЯдить</strong> (разрядка) / <strong>разрЕженный</strong> (редкий)
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>увИдать</strong> (видеть) / <strong>увЯдать</strong> (вянуть)
              <br />• <strong>благослОвлять</strong> (слово) / <strong>прослАвлять</strong> (слава)
              <br />• <strong>посвЯтить</strong> (свято) / <strong>просвЕтить</strong> (свет) •{' '}
              <strong>чЕстолюбие</strong>
            </div>
          </div>
        </div>

        {/* 4. Ё / О ПОСЛЕ ШИПЯЩИХ & ПОСЛЕ Ц В КОРНЕ */}
        <div className="cheat-subbox">
          <div className="cheat-subbox-title" style={{ color: 'var(--ios-purple)' }}>
            4. Ё / О после шипящих и И / Ы после Ц в корне (стр. 9–12)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                Ё / О ПОСЛЕ ШИПЯЩИХ
              </div>
              • <strong>Ё (есть чередование с Е):</strong>{' '}
              <em>
                чёрный (чернеть), дешёвый, жёрдочка, бечёвка, шёлковый, жёлуди, чёрствый, шёпот,
                решётка, кошелёк, кошёлка
              </em>
              .
              <br />• <strong>О (нет формы с Е):</strong>{' '}
              <em>
                крыжовник, шорох, шов, капюшон, трущоба, мажорный, шоссе, шоколад, шофёр, жокей,
                жонглёр
              </em>
              .
              <br />• <strong>-жёг- / -жог-:</strong> глагол → <strong>Ё</strong> (
              <em>поджёг траву</em>); сущ./прил. → <strong>О</strong> (<em>ожог, поджог дома</em>).
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                ПОСЛЕ Ц В КОРНЕ
              </div>
              • <strong>Всегда И:</strong>{' '}
              <em>циферблат, панцирь, цилиндр, рациональный, цифровой, цирк, цитата</em>.
              <MnemonicBox title="⭐ ИСКЛЮЧЕНИЯ С Ы ПОСЛЕ Ц">
                «Цыган на цыпочках цыкнул на цыплёнка: "Цыц!"»
              </MnemonicBox>
              • <strong>Словарные (стр. 9–12):</strong>{' '}
              <em>
                кампания/компания, палисадник, утрамбовать, бюллетень, жюри, парашют, брошюра,
                корифей, апелляция
              </em>
              .
            </div>
          </div>
        </div>
      </>
    ),
  },

  /* ==========================================================================
     ЗАДАНИЕ 10: ПРАВОПИСАНИЕ ПРИСТАВОК (СТР. 13–18)
     ========================================================================== */
  {
    task: '10',
    title: '10 · ПРАВОПИСАНИЕ ПРИСТАВОК',
    pages: 'стр. 13–18',
    accentVar: 'var(--ios-indigo)',
    softVar: 'var(--ios-indigo-soft)',
    keywords:
      'над под об от пред близ за на по до с взо о недо сбить несговорчивый здесь здание здоровье прабабушка праязык прообраз провозвестник розвальни раздать фока хочешь поесть щец несдержанный несгораемый чересчур дисбаланс расчет рассчитывать сыграть подытожить безымянный предыстория взимать изымать подымать сызнова сызмала межигровой сверхинтересный дез контр пан пост суб супер транс спортинвентарь пединститут съезд объявление адъютант субъект двухъярусный въедливый изъян неотъемлемый фельдъегерь иняз детясли партячейка вьюга соловьи подьячий арьергард бульон пребывать прибывать преступить приступить предать придать претворить притворить предел придел преемник приемник преклониться приклониться презирать призреть превратный привратник претерпеть притерпеться претензия прерогатива прецедент привилегия приоритет примадонна',
    content: (
      <>
        {/* 1. НЕИЗМЕНЯЕМЫЕ, ПРА/ПРО И ПРИСТАВКИ НА -З/-С */}
        <div className="cheat-subbox">
          <div className="cheat-subbox-title" style={{ color: 'var(--ios-indigo)' }}>
            1. Неизменяемые приставки, ПРА-/ПРО- и приставки на -З / -С
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-indigo)' }}>
                НЕИЗМЕНЯЕМЫЕ & ПРА / ПРО
              </div>
              • <strong>над-, под-, об-, от-, пред-, близ-, за-, на-, по-, до-, с-, взо-, о-, недо-</strong>.
              <br />• <strong>НЕИЗМЕНЯЕМАЯ С-:</strong> <em>сбить, несговорчивый</em> (в словах{' '}
              <em>здесь, здание, здоровье</em> — «з» в корне).
              <br />• <strong>ПРА- = предок/древность:</strong> <em>прабабушка, праязык</em>; ост. →{' '}
              <strong>ПРО-</strong>. <strong>Искл.:</strong> <em>прообраз, провозвестник</em>.
              <br />• <strong>раз(рас)/роз(рос):</strong> под уд. → <strong>О</strong> (
              <em>ро́звальни</em>), без уд. → <strong>А</strong> (<em>разда́ть</em>).
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-indigo)' }}>
                ПРИСТАВКИ НА -З И -С
              </div>
              • Перед звонкими (<em>б, в, г, д, ж, з, л, м, н, р</em>) → <strong>З</strong> (
              <em>без-, воз-, из-, вз-, низ-, чрез-</em>).
              <br />• Перед глухими корня → <strong>С</strong> (
              <em>бес-, вос-, ис-, вс-, нис-, черес-</em>).
              <MnemonicBox title="⭐ ЗАПОМИНАЛКА ГЛУХИХ СОГЛАСНЫХ">
                «Фока, хочешь поесть щец?» (<strong>ф, к, х, с, п, т, щ, ц, ч, ш</strong>) → перед
                ними всегда <strong>С</strong>!
              </MnemonicBox>
              • <strong>С двумя приставками:</strong> <em>не-с-держанный, не-с-гораемый</em>.
              <br />• <strong>Запомни:</strong>{' '}
              <em>чересчур, дисбаланс, расчёт (1 с) / рассчитывать (2 с)</em>.
            </div>
          </div>
        </div>

        {/* 2. Ы / И ПОСЛЕ ПРИСТАВОК И РАЗДЕЛИТЕЛЬНЫЕ Ъ / Ь */}
        <div className="cheat-subbox">
          <div className="cheat-subbox-title" style={{ color: 'var(--ios-indigo)' }}>
            2. Буквы Ы / И после приставок и Разделительные Ъ и Ь
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                Ы / И ПОСЛЕ ПРИСТАВОК
              </div>
              • <strong>Русская на согл. → Ы:</strong>{' '}
              <em>сыграть, подытожить, безымянный, предыстория</em>.
              <TrapBox title="⚡ ЗАПОМНИ ИСКЛЮЧЕНИЯ">
                <strong>взимать</strong> (но: <em>изымать, подымать</em>), <em>сызнова, сызмала</em>
              </TrapBox>
              • <strong>МЕЖ- и СВЕРХ- → И:</strong> <em>межигровой, сверхинтересный</em>.
              <br />• <strong>Иноязычные → И:</strong>{' '}
              <em>дез-, контр-, пан-, пост-, суб-, супер-, транс-</em>.
              <br />• <strong>Сложные:</strong> <em>спортинвентарь, пединститут</em>.
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                РАЗДЕЛИТЕЛЬНЫЕ Ъ И Ь
              </div>
              • <strong>Ъ:</strong> перед <strong>Е, Ё, Ю, Я</strong> после приставок на согласную (
              <em>съезд, объявление</em>), иноязычных <em>ад-, суб-, контр-, ин-, об-, транс-</em> (
              <em>адъютант, субъект</em>), числительных (<em>двухъярусный</em>).
              <br />• <strong>Слова с Ъ:</strong>{' '}
              <em>въедливый, изъян, неотъемлемый, фельдъегерь</em>.
              <div
                className="my-1 px-2 py-1 rounded-lg font-bold text-[11.5px]"
                style={{ background: 'var(--ios-red-soft)', color: 'var(--ios-red)' }}
              >
                ⛔ Без Ъ (сложносокращённые): иняз, детясли, партячейка!
              </div>
              • <strong>Ь:</strong> в корне/суффиксе перед <strong>Е, Ё, Ю, Я, И</strong> (
              <em>вьюга, соловьи, подьячий, арьергард</em>) и перед <strong>О</strong> (
              <em>бульон</em>).
            </div>
          </div>
        </div>

        {/* 3. ПРИСТАВКИ ПРЕ- И ПРИ- • СМЫСЛОВЫЕ ПАРЫ И СЛОВАРНЫЕ РАМКИ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              3. Приставки ПРЕ- и ПРИ- • Смысловые пары (стр. 16–18)
            </div>
            <BadgeTag label="СТР. 16–18" tone="purple" />
          </div>

          <div
            className="p-2 rounded-xl text-[12px] mb-2"
            style={{ background: 'var(--ios-purple-soft)' }}
          >
            <strong>ПРЕ-:</strong> 1 = «очень»; 2 = «пере-» (через); 3 = торжественность. {' | '}
            <strong>ПРИ-:</strong> близость, приближение, неполнота, доведение до конца,
            сопутствующее действие.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[12px] mb-2">
            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>пребывать</strong> (находиться) / <strong>прибывать</strong> (приезжать)
              <br />• <strong>предать</strong> (выдать) / <strong>придать</strong> (значение, вид)
              <br />• <strong>предел</strong> (граница) / <strong>придел</strong> (алтарь в храме)
              <br />• <strong>преемник</strong> (продолжатель) / <strong>приёмник</strong> (радио)
              <br />• <strong>презирать</strong> (не уважать) / <strong>призреть</strong> (дать приют)
              <br />• <strong>прекрасный</strong> (очень) / <strong>приукрасить</strong> (неполнота)
            </div>
            <div className="p-2 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              • <strong>преступить</strong> (нарушить) / <strong>приступить</strong> (начать)
              <br />• <strong>претворить</strong> (в жизнь) / <strong>притворить</strong> (дверь)
              <br />• <strong>претвориться</strong> (сбыться) / <strong>притвориться</strong> (вид)
              <br />• <strong>преклониться</strong> (уважать) / <strong>приклониться</strong> (к земле)
              <br />• <strong>превратный</strong> (ложный) / <strong>привратник</strong> (сторож)
              <br />• <strong>претерпеть</strong> (вынести) / <strong>притерпеться</strong> (привыкнуть)
            </div>
          </div>

          {/* СЛОВАРНЫЕ РАМКИ «ЗАПОМНИ» СО СТР. 18 */}
          <div
            className="p-2.5 rounded-xl text-[11.5px] leading-snug"
            style={{
              background: 'var(--ios-bg-cell-hover)',
              border: '0.5px solid var(--ios-separator)',
            }}
          >
            <div
              className="font-extrabold uppercase tracking-wider text-[10.5px] mb-1"
              style={{ color: 'var(--ios-indigo)' }}
            >
              Словарные рамки «ЗАПОМНИ» со стр. 18:
            </div>
            <div className="mb-1.5">
              <strong style={{ color: 'var(--ios-purple)' }}>ПРЕ-:</strong>{' '}
              <em>
                прекратить, претензия, преткновение, беспрекословно, предания, предаваться, прелюдия
                (но прилюдно), пресытиться, преследовать, пренебрежение, преобразовать, преклонный,
                пресловутый, пресмыкаться, препона, преамбула, превалировать, препинания,
                препираться, превзойти, превозмочь, препятствие, превозносить, пререкаться,
                прерогатива, президент, президиум, престиж, претендент, премьера, префект,
                прецедент, времяпрепровождение, непрестанный.
              </em>
            </div>
            <div>
              <strong style={{ color: 'var(--ios-blue)' }}>ПРИ-:</strong>{' '}
              <em>
                причудливый, привередливый, примитивный, приговор, сопричастный, прискорбный,
                пригожий, пристрастный, приобщение, приемлемый, непригодный, гостеприимство,
                приспособиться, неприхотливый, призывающий, прибаутка, неприступный, приволье,
                присягать, прибор, примадонна, привилегия, привыкать, приобрести, приоритет,
                придираться, приютить.
              </em>
            </div>
          </div>
        </div>
      </>
    ),
  },

  /* ==========================================================================
     ЗАДАНИЕ 11: ПРАВОПИСАНИЕ СУФФИКСОВ (СТР. 25–48)
     ========================================================================== */
  {
    task: '11',
    title: '11 · ПРАВОПИСАНИЕ СУФФИКСОВ',
    pages: 'стр. 25–48',
    accentVar: 'var(--ios-purple)',
    softVar: 'var(--ios-purple-soft)',
    keywords:
      'братец носит пальтецо а сестрица платьице красавец девица зоя ждет с бокальчиком переводчик летчик паромщик процентщик ключика замочка умничка утречко семечко бусинка вишенка нищенка неженка монашенка большинство первенство белизна тишина быстрота беготня сердцевина нищета стажер дирижер мажор ножовка тушенка ночевка березонька ноченька заинька паинька баиньки беседовать разглядывать запевать выкорчевывать ведро проржавело обессилел обессилил леденеть багрянеть затмевать застревать разевать продлевать увещевать встревать намереваться сомневаться обуревать подразумевать недоумевать выздороветь плесневеть ворочаться опротиветь опостылеть красивый марлевый милостивый юродивый доверчивый заботливый резкий немецкий французский гоняю как хочу на коньках легонький тихонький добренький чат аистов створчатый жилистый праздничный ежовый холщовый ветреный ветряной масленый масляный правило окна вправо насухо запросто настороже изредка докрасна сызнова снова подолгу смолоду сроду сбоку',
    content: (
      <>
        {/* 1. СУФФИКСЫ СУЩЕСТВИТЕЛЬНЫХ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              1. Суффиксы существительных
            </div>
            <BadgeTag label="ИЗОЛИРОВАННЫЕ БЛОКИ" tone="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            {/* -ЕЦ- / -ИЦ- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between mb-1">
                <strong>• -ЕЦ- / -ИЦ-</strong>
                <BadgeTag label="И / Е" tone="blue" />
              </div>
              <MnemonicBox title="⭐ ЗАПОМИНАЛКА">
                «Братец но́сит пальтецо́, а сестрица — пла́тьице»
              </MnemonicBox>
              • М.р. → <strong>-ец</strong> (<em>красавец</em>) | Ж.р. → <strong>-иц</strong> (
              <em>девица</em>)
              <br />• Ср.р.: до уд. → <strong>-ец-</strong> (<em>пальтецо́</em>); после уд. →{' '}
              <strong>-иц-</strong> (<em>пла́тьице</em>)
            </div>

            {/* -ЧИК- / -ЩИК- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between mb-1">
                <strong>• -ЧИК- / -ЩИК-</strong>
                <BadgeTag label="З, Ж, Д, Т, С" tone="orange" />
              </div>
              <MnemonicBox title="⭐ ЗАПОМИНАЛКА">
                «Зоя ждёт с бокальчиком» (<strong>З, Ж, Д, Т, С</strong>)
              </MnemonicBox>
              • После <strong>З, Ж, Д, Т, С</strong> → <strong>-чик-</strong> (
              <em>переводчик, лётчик</em>)
              <br />• Остальные согл. → <strong>-щик-</strong> (<em>паромщик</em>;{' '}
              <strong>искл.:</strong> <em>процентщик</em>)
            </div>

            {/* -ИК-/-ЕК- & -ИЧК-/-ЕЧК- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong>• -ИК- / -ЕК- | -ИЧК- / -ЕЧК-</strong>
              <div className="mt-1">
                • <strong>-ик-/-ек-:</strong> сохр. гласн. → <strong>-ик-</strong> (
                <em>ключика</em>); выпадает → <strong>-ек-</strong> (<em>замочка</em>)
                <br />• <strong>-ичк-/-ечк-:</strong> от <em>-ица</em> → <strong>-ичк-</strong> (
                <em>умничка ← умница</em>); ост. → <strong>-ечк-</strong> (<em>утречко, семечко</em>)
              </div>
            </div>

            {/* -ИНК-/-ЕНК- & -ИНСТВ-/-ЕНСТВ- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong>• -ИНК- / -ЕНК- | -ИНСТВ- / -ЕНСТВ-</strong>
              <div className="mt-1">
                • <strong>-инк-/-енк-:</strong> от <em>-ина</em> → <strong>-инк-</strong> (
                <em>бусинка</em>); от <em>-ня</em> → <strong>-енк-</strong> (<em>вишенка</em>)
                <br />• <strong>Запомни:</strong> <em>нищенка, неженка, монашенка</em>
                <br />• <strong>-инств-/-енств-:</strong> уд. на оконч. → <strong>-инств-</strong> (
                <em>большинство́</em>); не на оконч. → <strong>-енств-</strong> (<em>пе́рвенство</em>)
              </div>
            </div>

            {/* НЕИЗМЕНЯЕМЫЕ СУФФИКСЫ СУЩ. */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong>• НЕИЗМЕНЯЕМЫЕ СУФФИКСЫ СУЩ.</strong>
              <MnemonicBox title="⭐ ПРАВИЛО ВЫБОРА">
                «Всегда выбираем И (О), кроме -ет, -ест, -еств, -евин»
              </MnemonicBox>
              • <strong>И:</strong> <em>-изн-, -ин-, -ник-, -ниц-, -овин-</em> (
              <em>белизна, тишина</em>)
              <br />• <strong>О:</strong> <em>-отн-, -овн-, -от-, -ост-</em> (
              <em>быстрота, беготня</em>)
              <br />• <strong>Е:</strong> <em>-еств-, -евин-, -ет-, -ест-</em> (
              <em>сердцевина, нищета</em>)
            </div>

            {/* -ЁР-, ШИПЯЩИЕ И -ОНЬК-/-ЕНЬК- */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <strong>• -ЁР-, ШИПЯЩИЕ И -ОНЬК-/-ЕНЬК-</strong>
              <div className="mt-1">
                • <strong>-ёр-:</strong> всегда <strong>Ё</strong> (<em>стажёр, дирижёр</em>;{' '}
                <strong>искл.:</strong> <em>мажор</em>)
                <br />• Под уд.: <strong>О</strong> (<em>ножо́вка, медвежо́нок</em>); отглаг.{' '}
                <strong>Ё</strong> (<em>тушёнка, ночёвка</em>)
                <br />• <strong>-оньк-/-еньк-:</strong> <em>берёзонька; ноченька</em> (
                <strong>искл.:</strong> <em>заинька, паинька, баиньки</em>)
              </div>
            </div>
          </div>
        </div>

        {/* 2. СУФФИКСЫ ГЛАГОЛОВ (СТР. 28–31) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              2. Суффиксы глаголов (стр. 28–31)
            </div>
            <BadgeTag label="АЛГОРИТМ 2 ШАГОВ" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                ШАГ 1. ФОРМА 1 Л. («Я») & ПЕРЕД -Л-:
              </div>
              • На <strong>-ую/-юю</strong> → <strong>-ова-/-ева-</strong> (
              <em>беседую → беседовать, потчую → потчевать</em>)
              <br />• На <strong>-ываю/-иваю</strong> → <strong>-ыва-/-ива-</strong> (
              <em>разглядываю → разглядывать</em>)
              <br />• <strong>Перед -Л-:</strong> гласная как в инф. (
              <em>ла́ял ← ла́ять, кле́ил ← кле́ить</em>)
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                ШАГ 2. УДАРНЫЙ -ВА- & СЕМАНТИКА:
              </div>
              • <strong>Ударный -ВА-:</strong> отбрось <em>-ВА-</em>! (<em>запева́ть → запе́ть</em>)
              <br />• <strong>Ударный -ЁВЫВА-:</strong> всегда <strong>Ё</strong> (
              <em>выкорчёвывать</em>)
              <MnemonicBox title="⭐ ПЕРЕХОДНОСТЬ: «ВЕДРО ПРОРЖАВЕЛО»">
                • сам субъект → <strong>-е-</strong> (<em>обессилел, обезлюдели</em>)
                <br />• над объектом → <strong>-и-</strong> (<em>обессилил врага</em>)
              </MnemonicBox>
              • <strong>Состояние (-енеть):</strong> перед «н» <strong>Е</strong>: <em>леденеть</em>{' '}
              (<strong>искл.:</strong> <em>багрянеть</em>)
            </div>
          </div>

          <TrapBox title="⚡ ИСКЛЮЧЕНИЯ НА -ВАТЬ И ГЛАГОЛЫ ДЛЯ ЗАПОМИНАНИЯ">
            <strong>Ударный -ВА- (пишем Е):</strong>{' '}
            <em>
              затмевать, застревать, разевать, продлевать, увещевать, встревать, намереваться,
              сомневаться, обуревать (+ подразумевать, недоумевать)
            </em>
            .<br />
            <strong>Запомни инфинитивы:</strong>{' '}
            <em>
              выздороветь (выздоровеет, -ют), плесневеть, ворочаться, опротиветь, опостылеть
            </em>
            .
          </TrapBox>
        </div>

        {/* 3. ПРИЛАГАТЕЛЬНЫЕ И 4. НАРЕЧИЯ */}
        <div className="cheat-subbox">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            {/* 3. ПРИЛАГАТЕЛЬНЫЕ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between mb-1">
                <strong style={{ color: 'var(--ios-purple)' }}>
                  3. Прилагательные (стр. 44–47)
                </strong>
                <BadgeTag label="ПРАВИЛА 1–7" tone="purple" />
              </div>
              • <strong>-ИВ- / -ЕВ-:</strong> под уд. <strong>-ив-</strong> (<em>краси́вый</em>), без
              уд. <strong>-ев-</strong> (<em>марлевый</em>). <strong>Искл.:</strong>{' '}
              <em>милостивый, юродивый</em>.
              <br />• <strong>-ЧИВ- / -ЛИВ-:</strong> всегда <strong>И</strong> (
              <em>доверчивый, заботливый</em>).
              <br />• <strong>-К- / -СК-:</strong> качеств. (<em>резкий ← резок</em>) и основа на{' '}
              <strong>к, ц, ч → -к-</strong> (<em>немецкий, рыбацкий</em>); ост. →{' '}
              <strong>-ск-</strong> (<em>французский</em>).
              <MnemonicBox title="⭐ «ГОНЯЮ КАК ХОЧУ НА КОНЬКАХ» (Г, К, Х → -ОНЬК-)">
                После <strong>Г, К, Х</strong> → <strong>-оньк-</strong> (
                <em>лёгонький, тихонький</em>); ост. → <strong>-еньк-</strong> (<em>добренький</em>)
              </MnemonicBox>
              <MnemonicBox title="⭐ «ЧАТ АИСТОВ» (НЕИЗМЕНЯЕМЫЕ)">
                Всегда пары О / Е (<em>береговой, сероватый</em>), кроме <strong>«чат аистов»</strong>
                : суффиксы <strong>-чат-, -ат-, -ист-</strong> пишутся только с <strong>А</strong> и{' '}
                <strong>И</strong> (<em>створчатый, жилистый</em>).
              </MnemonicBox>
              • <strong>-ич-/-еч-:</strong> от <em>-ик/-ица</em> → <strong>-ич-</strong> (
              <em>праздничный</em>); ост. → <strong>-еч-</strong>.
              <br />• Под уд. после шипящ./Ц: <strong>О́</strong> (<em>ежо́вый, холщо́вый, смешо́н</em>).
              <br />• <strong>Пары:</strong> <em>ветреный</em> (день) / <em>ветряной</em>{' '}
              (двигатель); <em>масленый</em> (блин) / <em>масляный</em> (насос).
            </div>

            {/* 4. НАРЕЧИЯ */}
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between mb-1">
                <strong style={{ color: 'var(--ios-orange)' }}>4. Наречия (стр. 48)</strong>
                <BadgeTag label="«ПРАВИЛО ОКНА»" tone="orange" />
              </div>
              <MnemonicBox title="⭐ ОКНО — ПОДСТАВЬ «ОКНО» С ПРЕДЛОГОМ">
                • <strong>В-, НА-, ЗА- → суффиксы -О, -Е:</strong>
                <br />
                <em>«в окно́, на окно́, за окно́» → вправо, насухо, запросто, настороже</em>
                <br />• <strong>ИЗ-, ДО-, С- → суффиксы -А, -Я:</strong>
                <br />
                <em>«из окна́, до окна́, с окна́» → изредка, докрасна, сызнова, снова</em>
              </MnemonicBox>
              <TrapBox title="⚠️ ЛОВУШКА В НАРЕЧИЯХ">
                <strong>НО: ДОВЕРЧИВО, ЗАНОСЧИВО!</strong> (образованы от прил. с суффиксом{' '}
                <em>-чив-/-лив-</em>, поэтому на конце <strong>-О</strong>).
              </TrapBox>
              • <strong>ПО- → суффикс -У:</strong> <em>«по окну́» → подолгу</em> (
              <strong>но:</strong> <em>смолоду, сроду, сбоку</em>).
            </div>
          </div>
        </div>
      </>
    ),
  },

  /* ==========================================================================
     ЗАДАНИЕ 12: ОКОНЧАНИЯ И ПРИЧАСТИЯ (СТР. 49–59)
     ========================================================================== */
  {
    task: '12',
    title: '12 · ОКОНЧАНИЯ И ПРИЧАСТИЯ',
    pages: 'стр. 49–59',
    accentVar: 'var(--ios-orange)',
    softVar: 'var(--ios-orange-soft)',
    keywords:
      'спряжение инфинитив брить стелить зиждиться зыбиться взять аленку лаять сеять веять лелеять таять каяться драить клеить гнать держать дышать слышать смотреть видеть ненавидеть зависеть терпеть обидеть вертеть спать спишь лететь летит хотеть бежать целую милая машет машут строит строят брезжущий алчущий всеобъемлющий неприемлемый неотъемлемый незыблемый движимый мучимый мучащий клеивший растаявший увидевший склеенный застреленный расстрелянный вывалянный вываленный замешанный замешенное скачанный скаченный',
    content: (
      <>
        {/* ШАГ 1. СПРЯЖЕНИЕ ПО ИНФИНИТИВУ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-orange)' }}>
              Шаг 1. Спряжение по инфинитиву (для безударных)
            </div>
            <BadgeTag label="ИНФИНИТИВ" tone="orange" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                I СПРЯЖЕНИЕ
              </div>
              1. Все глаголы <strong>НЕ на -ить</strong> (<em>-АТЬ, -ЕТЬ, -ЯТЬ, -ОТЬ, -УТЬ</em>).
              <br />
              2. <strong>4 ИСКЛЮЧЕНИЯ:</strong> <em>брить, стелить, зиждиться, зыбиться</em>.
              <MnemonicBox title="⭐ «ВЗЯТЬ АЛЁНКУ» (ГЛАГОЛЫ НА -ЯТЬ — I СПР.)">
                <em>ла́ять, се́ять, ве́ять, леле́ять, та́ять, ка́яться, чу́ять, ма́яться, наде́яться</em>
              </MnemonicBox>
              <div
                className="px-2 py-1 rounded-lg font-bold text-[11.5px]"
                style={{ background: 'var(--ios-red-soft)', color: 'var(--ios-red)' }}
              >
                ⛔ Искл. (на -ИТЬ): дра́ить, кле́ить (II спр.!).
              </div>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                II СПРЯЖЕНИЕ
              </div>
              1. Все глаголы на <strong>-ИТЬ</strong> (кроме 4 искл.).
              <br />
              2. <strong>11 ИСКЛЮЧЕНИЙ:</strong>
              <MnemonicBox title="⭐ СТИШОК 11 ИСКЛЮЧЕНИЙ II СПРЯЖЕНИЯ">
                Гнать, держать, дышать и слышать,
                <br />
                Смотреть, видеть, ненавидеть,
                <br />И зависеть, и терпеть,
                <br />И обидеть, и вертеть.
              </MnemonicBox>
              <div className="text-[11.5px]" style={{ color: 'var(--ios-label-sec)' }}>
                Суффикс не сохраняется (<em>клеить → клеишь</em>).
              </div>
            </div>
          </div>

          <div
            className="mt-2 p-2 rounded-xl text-[12px]"
            style={{ background: 'var(--ios-bg-cell-hover)' }}
          >
            • <strong>Ударное окончание:</strong> спряжение смотрим сразу по окончанию (
            <em>спать → спи́шь</em> — II, <em>лететь → лети́т</em> — II).
            <br />• <strong>Разноспрягаемые:</strong> <em>хотеть, бежать</em>. В форме 1 л. («Я») у
            обоих спряжений: <strong>-у, -ю</strong> (<em>лаю, дышу, машу, строю</em>).
          </div>
        </div>

        {/* ШАГ 2. НАСТОЯЩЕЕ И БУДУЩЕЕ ВРЕМЯ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              Шаг 2. Настоящее и будущее время (по спряжению)
            </div>
            <BadgeTag label="⭐ ЦЕЛУЮ, МИЛАЯ" tone="orange" />
          </div>

          <table className="cheat-table">
            <thead>
              <tr>
                <th>Спряжение</th>
                <th>Гласные</th>
                <th>Личные окончания</th>
                <th>Суффиксы причастий</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>I спр. (цЕлУЮ)</strong>
                </td>
                <td>
                  <strong>Е, У, Ю</strong>
                </td>
                <td>
                  <strong>-ешь, -ет, -ем, -ете / -ут, -ют</strong> (<em>машет, машут</em>)
                </td>
                <td>
                  <strong>-ущ- / -ющ-, -ем- / -ом-</strong>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>II спр. (мИлАЯ)</strong>
                </td>
                <td>
                  <strong>И, А, Я</strong>
                </td>
                <td>
                  <strong>-ишь, -ит, -им, -ите / -ат, -ят</strong> (<em>строит, строят</em>)
                </td>
                <td>
                  <strong>-ащ- / -ящ-, -им-</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <TrapBox title="⚡ ИСКЛЮЧЕНИЯ ПРИЧАСТИЙ (СТР. 58)">
            • <strong>I спр.:</strong>{' '}
            <em>
              брезжущий, алчущий, всеобъемлющий, неприемлемый, неотъемлемый, незыблемый
            </em>
            <br />• <strong>II спр.:</strong>{' '}
            <em>движимый (от движити), мучимый, мучащий</em>
          </TrapBox>
        </div>

        {/* ШАГ 3. ПРОШЕДШЕЕ ВРЕМЯ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-red)' }}>
              Шаг 3. Прошедшее время • Спряжение не нужно!
            </div>
            <BadgeTag label="ГЛАСНАЯ ИНФИНИТИВА" tone="red" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
                ПЕРЕД -ВШ-, -Ш-, -Л-:
              </div>
              Гласная инфинитива 1-в-1:
              <br />• <em>кле́ивший ← кле́ить</em>
              <br />• <em>раста́явший ← раста́ять</em>
              <br />• <em>уви́девший ← уви́деть</em>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold mb-1" style={{ color: 'var(--ios-purple)' }}>
                ПЕРЕД -НН- / -Н-:
              </div>
              • <strong>-ать → -анн-</strong> (<em>написанный</em>)
              <br />• <strong>-ять → -янн-</strong> (<em>посеянный</em>)
              <br />• <strong>-ить / -еть → ТОЛЬКО -ЕНН-!</strong> (<em>скле́ить → скле́енный</em>)
            </div>
          </div>

          <TrapBox title="⚡ ГЛАВНЫЕ ПАРЫ-ЛОВУШКИ НА -АНН- / -ЕНН-">
            • <strong>застреленный</strong> (застрелить) / <strong>расстрелянный</strong>{' '}
            (расстрелять)
            <br />• <strong>вывалянный</strong> в грязи (вывалять) / <strong>вываленный</strong> из
            мешка (вывалить)
            <br />• <strong>замешанный</strong> в преступлении (замешать) /{' '}
            <strong>замешенное</strong> тесто (замесить)
            <br />• <strong>скачанный</strong> файл (скачать) / <strong>скаченный</strong> с горы шар
            (скатить)
          </TrapBox>
        </div>
      </>
    ),
  },

  /* ==========================================================================
     ЗАДАНИЕ 13: ПРАВОПИСАНИЕ НЕ И НИ (СТР. 60–62)
     ========================================================================== */
  {
    task: '13',
    title: '13 · ПРАВОПИСАНИЕ НЕ И НИ',
    pages: 'стр. 60–62',
    accentVar: 'var(--ios-pink)',
    softVar: 'var(--ios-pink-soft)',
    keywords:
      'слитно раздельно невежа невзгоды нельзя ненастный негодовать не по товарищески гораздо совершенно совсем весьма крайне почти очень не вода вовсе отнюдь далеко нисколько ничуть никому союз но противопоставление с а неправда несчастье неширокая неплохо не быстрее не громче неподготовленная не исправленные некого незачем неоткуда не с кем часы не золотые мед не липовый не рад не жаль не должен не готов не намерен не обязан не склонен не надо не нужно не пора недоедают не досмотрели несмотря на не смотря вдаль ничтожный ничейный никто ничего ниоткуда никакой нигде никогда ни крошки',
    content: (
      <>
        {/* СЛИТНОЕ И РАЗДЕЛЬНОЕ НАПИСАНИЕ НЕ (ПУНКТЫ 1–4) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-pink)' }}>
              Слитное и раздельное написание НЕ (Пункты 1–4)
            </div>
            <div className="flex items-center gap-1">
              <BadgeTag label="СЛИТНО" tone="green" />
              <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            {/* СЛИТНО 1-3 */}
            <div className="p-2.5 rounded-xl flex flex-col gap-2" style={{ background: 'var(--ios-green-soft)' }}>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <strong>1. Без НЕ не употребляется</strong>
                  <BadgeTag label="СЛИТНО" tone="green" />
                </div>
                <em>невежа, невзгоды, нельзя, ненастный, негодовать</em>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <strong>2. Наречия меры и степени</strong>
                  <BadgeTag label="СЛИТНО" tone="green" />
                </div>
                (<em>гораздо, совершенно, совсем, весьма, крайне, почти, очень</em>):{' '}
                <em>крайне недалеко, весьма неглупый, очень необдуманно</em>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <strong>3. Союз «НО» (нет отриц.)</strong>
                  <BadgeTag label="СЛИТНО" tone="green" />
                </div>
                <em>Река неглубокая, но холодная.</em>
              </div>
            </div>

            {/* РАЗДЕЛЬНО 1-3 */}
            <div className="p-2.5 rounded-xl flex flex-col gap-2" style={{ background: 'var(--ios-red-soft)' }}>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <strong>1. Слова через дефис</strong>
                  <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
                </div>
                <em>Герой поступил не по-товарищески.</em>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <strong>2. Усиливающие отрицание</strong>
                  <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
                </div>
                <MnemonicBox title="⭐ ЗАПОМИНАЛКА «НЕ ВОДА»">
                  <strong>В</strong>овсе, <strong>О</strong>тнюдь, <strong>Д</strong>алеко (+{' '}
                  <em>нисколько, ничуть, никому</em>): <em>далеко не вежливый, ничуть не торжественно</em>
                </MnemonicBox>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <strong>3. Противопоставление с «А»</strong>
                  <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
                </div>
                <em>Он оказался не интересным, а скучным.</em>
              </div>
            </div>
          </div>

          <div
            className="mt-2 p-2.5 rounded-xl text-[12px]"
            style={{ background: 'var(--ios-red-soft)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <strong>
                4. Глаголы, деепричастия, наречия НЕ на -о/-е, кратк. прич., числит., союзы,
                частицы, предлоги
              </strong>
              <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
            </div>
            <em>
              Я не слышал его. • Не желая оставаться, решил помочь. • Не всегда готов. • Не раз
              возвращались.
            </em>
          </div>
        </div>

        {/* ЧАСТИ РЕЧИ И УСЛОВИЯ (ПУНКТЫ 5–10) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              Части речи и условия (Пункты 5–10)
            </div>
            <BadgeTag label="ЧАСТИ РЕЧИ" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between">
                <strong>5. Сущ. (есть синоним без НЕ)</strong>
                <BadgeTag label="СЛИТНО" tone="green" />
              </div>
              <div>
                <em>неправда (ложь), несчастье (горе)</em>
              </div>

              <div className="flex items-center justify-between mt-1">
                <strong>6. Прил. / наречие на -О (синоним)</strong>
                <BadgeTag label="СЛИТНО" tone="green" />
              </div>
              <div>
                <em>неширокая (узкая), неплохо (хорошо)</em>
              </div>

              <div className="flex items-center justify-between mt-1">
                <strong>7. Полные одиночные причастия</strong>
                <BadgeTag label="СЛИТНО" tone="green" />
              </div>
              <div>
                <em>неподготовленная речь (без завис. слов)</em>
              </div>

              <div className="flex items-center justify-between mt-1">
                <strong>8. Отриц./неопред. мест. и нареч.</strong>
                <BadgeTag label="СЛИТНО" tone="green" />
              </div>
              <div>
                <em>некого, незачем, неоткуда (без предлога)</em>
              </div>

              <div className="flex items-center justify-between mt-1">
                <strong>9. Главное правило проверки</strong>
                <BadgeTag label="АЛГОРИТМ" tone="orange" />
              </div>
              <div>Употребляется без НЕ + есть условие → раздельно.</div>
            </div>

            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between">
                <strong>5. Вопросит. предл. (логич. отриц.)</strong>
                <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
              </div>
              <div>
                <em>Не правда ли?</em>
              </div>

              <div className="flex items-center justify-between mt-1">
                <strong>6. Сравнит. / превосх. степень</strong>
                <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
              </div>
              <div>
                <em>двигался не быстрее, говорил не громче</em>
              </div>

              <div className="flex items-center justify-between mt-1">
                <strong>7. Причастие с зависимым словом</strong>
                <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
              </div>
              <div>
                <em>не исправленные (когда?) вовремя ошибки</em>
              </div>

              <div className="flex items-center justify-between mt-1">
                <strong>8. Местоимения с предлогом</strong>
                <BadgeTag label="В 3 СЛОВА" tone="red" />
              </div>
              <div>
                Правило «в 3 слова»: <em>Мне не с кем поговорить.</em>
              </div>

              <div className="flex items-center justify-between mt-1">
                <strong>10. Относительные прил.</strong>
                <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
              </div>
              <div>
                Нет кратк. ф.: <em>часы не золотые, мёд не липовый</em>
              </div>
            </div>
          </div>
        </div>

        {/* ОСОБЫЕ СЛУЧАИ НЕ (ПУНКТЫ 11–14) И ПРАВОПИСАНИЕ НИ */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              Особые случаи НЕ (Пункты 11–14) и правописание НИ
            </div>
            <BadgeTag label="СКАЗУЕМЫЕ • НЕДО- • НИ" tone="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] mb-2">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-red-soft)' }}>
              <div className="flex items-center justify-between mb-1">
                <strong>11. Краткие прил. (роль сказуемого)</strong>
                <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
              </div>
              <em>не рад, не жаль, не должен, не готов, не намерен, не обязан, не склонен</em>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-red-soft)' }}>
              <div className="flex items-center justify-between mb-1">
                <strong>12. Наречие в безличном (сказуемое)</strong>
                <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
              </div>
              <em>мне не надо ничего, не нужно, не пора</em>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between mb-1">
                <strong>13. Приставка НЕДО- vs НЕ + ДО-</strong>
                <BadgeTag label="СМЫСЛ" tone="orange" />
              </div>
              • <strong>СЛИТНО (мало):</strong> <em>недоедают; недосмотрела за дитя</em>
              <br />• <strong>РАЗДЕЛЬНО (не до конца):</strong> <em>не досмотрели фильм</em>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between mb-1">
                <strong>14. Предлог VS Деепричастие</strong>
                <BadgeTag label="СМЫСЛ" tone="orange" />
              </div>
              • <strong>Предлог (СЛИТНО):</strong> <em>Несмотря на мороз (= вопреки)</em>
              <br />• <strong>Дееприч. (РАЗД.):</strong> <em>Не смотря вдаль (= добав. действ.)</em>
            </div>
          </div>

          {/* ПРАВОПИСАНИЕ НИ */}
          <div
            className="p-2.5 rounded-xl text-[12px]"
            style={{ background: 'var(--ios-bg-cell-hover)' }}
          >
            <div className="font-extrabold mb-1" style={{ color: 'var(--ios-blue)' }}>
              Слитное и раздельное написание НИ:
            </div>
            1. <strong>НИ СЛИТНО:</strong> слово без «ни» не употребляется —{' '}
            <em>ничтожный, ничейный</em>.
            <br />
            2. <strong>НИ СЛИТНО:</strong> в отриц. мест. и наречиях (без предлога) —{' '}
            <em>никто, ничего, ниоткуда, никакой, нигде, никогда</em>.
            <br />
            3. <strong>НИ РАЗДЕЛЬНО:</strong> в остальных случаях (с предлогом в 3 слова) —{' '}
            <em>ни крошки, ни ты, ни вправо, ни о чём, ни с кем</em>.
          </div>
        </div>
      </>
    ),
  },

  /* ==========================================================================
     ЗАДАНИЕ 14: РАЗЛИЧНОЕ НАПИСАНИЕ СЛОВ (СТР. 68–77)
     ========================================================================== */
  {
    task: '14',
    title: '14 · СЛИТНО, ДЕФИС, РАЗДЕЛЬНО',
    pages: 'стр. 68–77',
    accentVar: 'var(--ios-green)',
    softVar: 'var(--ios-green-soft)',
    keywords:
      'слитно дефис раздельно предлоги созвучные союзы чтобы что бы также так же тоже то же зато причём притом итак наречия по ому ему ки ни ьи отчего оттого почему поэтому зачем затем навстречу вдаль тотчас наоборот вслух насколько натощак вполголоса вполоборота исподтишка воочию насмарку напоследок впопыхах вдогонку вдоволь впритирку впотьмах второпях впоследствии кстати изнутри издалека отчасти внутри внутрь всерьёз всецело напротив нараспашку наружу настежь наспех позади попросту вскоре запросто издавна зачастую понемногу потихоньку повсюду добела донельзя досуха досыта дочиста настолько откуда отсюда оттуда поменьше вдолгую на попятную на боковую на мировую в открытую вверх справа сначала наконец вовремя доверху навсегда поначалу наперёд снова навек вблизи вбок вброд вдалеке вконец влево вниз внизу вокруг вперёд впереди вправо вширь кверху набок наверх наверху назад накануне налево направо напрямую наравне поверх посреди сбоку сверху сзади слева снаружи снизу поодиночке надвое втроём впервые сразу воедино наедине вдвое вдвоём втрое натрое в одиночку по двое по одному на четверых за двоих по трое в упор в обход в общем в обрез в обнимку в обтяжку без толку без умолку без конца без оглядки без разбору без спросу до упаду до смерти до завтра до отказа за глаза за границу под стать под мышкой со временем с полуслова с разбегу с размаху с ходу частицы бы ли же вряд ли то либо нибудь ка с кое таки пол полу пол-лимона пол-яблока пол-Москвы сложные слова',
    content: (
      <>
        {/* 1. ПРОИЗВОДНЫЕ ПРЕДЛОГИ И СОЗВУЧНЫЕ СОЧЕТАНИЯ (СТР. 68–69) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              1. Производные предлоги и созвучные сочетания (стр. 68–69)
            </div>
            <BadgeTag label="ПРЕДЛОГ VS СУЩ." tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] mb-2">
            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between">
                <strong>Пункты 1–6: ПРЕДЛОГИ СЛИТНО</strong>
                <BadgeTag label="СЛИТНО" tone="green" />
              </div>
              <div>
                1. <strong>насчёт</strong> (= о, об): <em>поговорить насчёт квартиры</em>
                <br />
                <span className="opacity-75">сущ.: на счёт в банке</span>
              </div>
              <div>
                2. <strong>вроде, наподобие</strong> (= похоже): <em>вроде воспоминаний, пальто наподобие моего</em>
                <br />
                <span className="opacity-75">сущ.: в роде и падеже, на подобие фигур</span>
              </div>
              <div>
                3. <strong>вследствие, ввиду</strong> (= из-за): <em>вследствие пожара, ввиду непогоды</em>
                <br />
                <span className="opacity-75">сущ.: в следствие по делу, в виду города</span>
              </div>
              <div>
                4. <strong>вместо</strong> (= взамен): <em>вместо весёлой жизни</em>
                <br />
                <span className="opacity-75">сущ.: в место встречи</span>
              </div>
              <div>
                5. <strong>вслед</strong> (= за, после): <em>вслед нам</em>
                <br />
                <span className="opacity-75">сущ.: всматривался в след зверя</span>
              </div>
              <div>
                6. <strong>Запомни СЛИТНО:</strong> <em>несмотря на, невзирая на, помимо, сверх.</em>
              </div>
            </div>

            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="flex items-center justify-between">
                <strong>Пункты 7–9: РАЗДЕЛЬНО и ДЕФИС</strong>
                <BadgeTag label="РАЗДЕЛЬНО" tone="red" />
              </div>
              <div>
                7. <strong>в течение, в продолжение</strong> (= как долго, на конце -Е): <em>в течение трёх дней, в продолжение сессии</em>
                <br />
                <span className="opacity-75">сущ.: в течение реки, в продолжении романа</span>
              </div>
              <div>
                8. <strong>в заключение</strong> (= под конец): <em>в заключение концерта</em>
                <br />
                <span className="opacity-75">сущ.: находились в заключении</span>
              </div>
              <div>
                9. <strong>Запомни (!):</strong> <em>в силу, в отличие от, на протяжении, по сравнению с, в связи с, за счёт, за неимением, с виду, в виде.</em>
              </div>
              <div className="mt-1">
                • <strong>ЧЕРЕЗ ДЕФИС:</strong> <em>из-за, из-под.</em>
              </div>
            </div>
          </div>

          <div
            className="p-2 rounded-xl text-[12px] font-semibold flex items-center justify-between gap-2"
            style={{ background: 'var(--ios-orange-soft)', color: 'var(--ios-orange)' }}
          >
            <span>❗ Ловушки: <em>Отчёт в виде презентации</em> • <em>Иметь в виду</em> (устойчивое)</span>
            <BadgeTag label="СТР. 68–69" tone="orange" />
          </div>
        </div>

        {/* 2. СЛИТНОЕ И РАЗДЕЛЬНОЕ НАПИСАНИЕ СОЮЗОВ (СТР. 70–71) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-green)' }}>
              2. Слитное и раздельное написание союзов (стр. 70–71)
            </div>
            <BadgeTag label="СОЮЗ VS МЕСТ./НАРЕЧ." tone="green" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] mb-2">
            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-green-soft)' }}>
              <div>
                1. <strong>ЧТОБЫ</strong> (= для того чтобы, союз):
                <br />
                <em>Чтобы поправить здоровье...</em>
              </div>
              <div>
                2. <strong>ТОЖЕ, ТАКЖЕ</strong> (= ещё; взаимозаменяемы):
                <br />
                <em>Я тоже опустил руку; а также пастилу.</em>
              </div>
              <div>
                3. <strong>ЗАТО</strong> (= но, союз):
                <br />
                <em>Подъём крутой, зато дорога красивая.</em>
              </div>
              <div>
                4. <strong>ПРИЧЁМ, ПРИТОМ</strong> (= к тому же, взаимозаменяемы):
                <br />
                <em>проведены, причём впервые; притом быстро.</em>
              </div>
              <div>
                5. <strong>ИТАК</strong> (= следовательно):
                <br />
                <em>Итак, всё кончено.</em>
              </div>
              <div>
                6. <strong>Запомни:</strong> <em>будто, впрочем, поскольку</em>
              </div>
            </div>

            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-red-soft)' }}>
              <div>
                1. <strong>что бы</strong> (мест. + част. бы):
                <br />
                <em>Что бы ещё придумать?</em>
              </div>
              <div>
                2. <strong>то же</strong> (= + самое: <em>то же настроение</em>);
                <br />
                <strong>так же</strong> (= таким же образом: <em>так же, как вчера</em>).
              </div>
              <div>
                3. <strong>за то</strong> (= указание):
                <br />
                <em>зашёл за то дерево.</em>
              </div>
              <div>
                4. <strong>при чём</strong> (только в вопросит. предл.! <em>При чём тут мы?</em>);
                <br />
                <strong>при том</strong> (<em>при том издательстве</em>).
              </div>
              <div>
                5. <strong>и так</strong> (= указание):
                <br />
                <em>И так кончается день.</em>
              </div>
              <div>
                6. <strong>Раздельно:</strong> <em>то есть, так что, как только, так как, во что бы то ни стало.</em>
              </div>
            </div>
          </div>

          <div
            className="p-2 rounded-xl text-[12px] font-medium"
            style={{ background: 'var(--ios-bg-cell-hover)' }}
          >
            [ Запомни: <em>так же, как; всё так же; одно и то же; то же самое</em> ] ❗
          </div>
        </div>

        {/* 3. ПРАВОПИСАНИЕ НАРЕЧИЙ И СОЗВУЧНЫХ СОЧЕТАНИЙ (СТР. 72–74, 77) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              3. Правописание наречий и созвучных сочетаний (стр. 72–74, 77)
            </div>
            <BadgeTag label="ПУНКТЫ 1–12" tone="purple" />
          </div>

          <div className="p-2.5 rounded-xl text-[12px] flex flex-col gap-1.5 mb-2" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div>
              1. <strong>ДЕФИС:</strong> приставка <strong>по-</strong> + суффиксы <strong>-ому, -ему, -ки, -ни, -ьи</strong>:{' '}
              <em>по-плохому, по-прежнему, по-французски, по-латыни, по-лисьи.</em>
            </div>
            <div>
              2. <strong>отчего, оттого</strong> (= причина: почему, потому) | <strong>от чего, от того</strong> (мест.: <em>от того, как сложится день</em>).
            </div>
            <div>
              3. <strong>почему, потому, поэтому</strong> (= причина/следствие) | <strong>по чему, по тому, по этому</strong> (<em>по этому пути</em>).
            </div>
            <div>
              4. <strong>зачем, затем</strong> (= цель, время) | <strong>за чем, за тем</strong> (<em>за чем пойдёшь; за тем и пришёл</em>).
            </div>
            <div>
              5. <strong>навстречу</strong> (= по направлению к: <em>поспешил навстречу друзьям</em>) | сущ.: <em>не надеялся на встречу с другом</em>.
            </div>
            <div>
              6. <strong>Пары (стр. 73):</strong> <em>глядеть вдаль — в даль моря; тотчас поняли — помню тот час; наконец дошли — на конец палки; сделать наоборот — пришить на оборот; читать вслух — обратился в слух; насколько живописна — на сколько дней.</em>
              <br />
              <span className="opacity-80">❗ <em>отдыхали за границей</em> (нареч.) — <em>посетить заграницу</em> (сущ.)</span>
            </div>
            <div>
              7. <strong>СЛИТНО (без предлога не употр.):</strong> <em>натощак, вполголоса, вполоборота, исподтишка, воочию, насмарку, напоследок, впопыхах, вдогонку, вдоволь, впритирку, впотьмах, второпях, впоследствии, кстати, изнутри, издалека, отчасти, внутри, внутрь, всерьёз, всецело, напротив, нараспашку, наружу, настежь, наспех, позади.</em>
            </div>
            <div>
              8. <strong>СЛИТНО (прист. + прил./нареч.):</strong> <em>попросту, вскоре, запросто, издавна, зачастую, понемногу, потихоньку, повсюду, добела, донельзя, досуха, досыта, дочиста, настолько, откуда, отсюда, оттуда, поменьше, вдолгую.</em>
              <br />
              <span className="text-[11.5px] font-bold" style={{ color: 'var(--ios-orange)' }}>
                [ Исключения: на попятную, на боковую, на мировую, в открытую ]
              </span>
            </div>
            <div>
              9. <strong>СЛИТНО (сущ. пространства/времени):</strong> <em>вверх, справа, сначала, наконец, вовремя, доверху, тотчас, навсегда, поначалу, наперёд, снова, навек (но на века), вблизи, вбок, вброд, вдалеке, вконец, влево, вниз, внизу, вокруг, вперёд, впереди, вправо, вширь, кверху, набок, наверх, наверху, назад, накануне, налево, направо, напрямую, наравне, поверх, посреди, сбоку, сверху, сзади, слева, снаружи, снизу.</em>
            </div>
            <div>
              10. <strong>Запомни (!):</strong> <em>поодиночке, надвое, втроём, впервые, сразу, воедино, наедине, вдвое, вдвоём, втрое, натрое</em> | <em>в одиночку, по двое, по одному, на четверых, за двоих, по трое.</em>
            </div>
            <div>
              11. <strong>РАЗДЕЛЬНО (предлог на согл. + гласная):</strong> <em>в упор, в обход, в общем, в обрез, в обнимку, в обтяжку.</em>
            </div>
            <div>
              12. <strong>РАЗДЕЛЬНО («без», «до», «за», «под», «с»/«со»):</strong> <em>без толку, без умолку, без конца, без оглядки, без разбору, без спросу, до упаду, до смерти, до завтра, до отказа, за глаза, за границу, под стать, под мышкой, со временем, с полуслова, с разбегу, с размаху, с ходу.</em>
            </div>
          </div>
        </div>

        {/* 4. ЧАСТИЦЫ И ПОЛ- / ПОЛУ- (СТР. 74–75) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-orange)' }}>
              4. Частицы и корень ПОЛ- / ПОЛУ- (стр. 74–75)
            </div>
            <BadgeTag label="ЧАСТИЦЫ • ПОЛ-" tone="orange" />
          </div>

          <div className="p-2.5 rounded-xl text-[12px] flex flex-col gap-1.5 mb-2" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div>
              • 1. <strong>РАЗДЕЛЬНО:</strong> <em>бы (б), ли (ль), же (ж)</em> (<em>как бы, едва ли, всё же + вряд ли</em>).
            </div>
            <div>
              • 2. <strong>ДЕФИС:</strong> <em>-то, -либо, -нибудь, -ка, -с</em> и <em>кое-</em> (<em>где-то, кто-либо, ну-ка, слушаю-с</em>).
            </div>
            <div>
              • 3. <strong>Запомни (!):</strong> <em>будто, как будто, почти что, кое у кого, вряд ли.</em>
            </div>
            <div>
              • 4. <strong>-ТАКИ:</strong> дефис после глагола (<em>опоздал-таки, съел-таки</em>) и в <em>всё-таки, опять-таки, довольно-таки</em>. [Раздельно: <em>я таки опоздал, друг таки не пришёл</em>].
            </div>
          </div>

          <div className="p-2.5 rounded-xl text-[12px] flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div className="font-extrabold" style={{ color: 'var(--ios-purple)' }}>
              ⭐ ПОЛ- ЧЕРЕЗ ДЕФИС (запись со стр. 75: «— ЛЯМ» / правило ЮЛИ):
            </div>
            <div>1) <strong>пол- + л</strong>: <em>пол-лимона</em> (Запомни: <em>поллитровка</em>);</div>
            <div>2) <strong>пол- + гласный</strong>: <em>пол-яблока</em> (Запомни: <em>пол-йогурта</em>);</div>
            <div>3) <strong>пол- + заглавная</strong>: <em>пол-Москвы</em>.</div>
            <div className="mt-1">
              • <strong>СЛИТНО:</strong> 1) пол- + согласная (кроме «л»): <em>полметра</em>; 2) <strong>полу-</strong> + любое слово: <em>полутьма</em>.
              <br />
              • <strong>РАЗДЕЛЬНО:</strong> пол + определение + сущ.: <em>пол чайной ложки, пол ясного неба</em>.
            </div>
          </div>
        </div>

        {/* 5. ПРАВОПИСАНИЕ СЛОЖНЫХ СЛОВ (СТР. 75–76) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              5. Правописание сложных слов (стр. 75–76)
            </div>
            <BadgeTag label="ПУНКТЫ 1–6" tone="blue" />
          </div>

          <div className="p-2.5 rounded-xl text-[12px] flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div>
              1. <strong>ДЕФИС (повторение слова):</strong> <em>большими-большими, тихо-тихо, давным-давно, крепко-накрепко, мало-помалу, точь-в-точь.</em>
            </div>
            <div>
              2. <strong>СЛИТНО сложные прилагательные (подчинительная связь):</strong> <em>железнодорожный (железная дорога), древнерусский, средневековый, гладкошёрстный, сельскохозяйственный, голубоглазые, йодосодержащий, овощемоечный, рельсоукладочный, сталелитейный, двухэтажный.</em>
            </div>
            <div>
              3. <strong>ДЕФИС сложные прилагательные (оттенки цвета, вкуса, стороны света):</strong> <em>иссиня-чёрный, бледно-серый, тёмно-синий, кисло-сладкий, юго-восточный, северо-восток.</em>
            </div>
            <div>
              4. <strong>СЛИТНО сложные сущ. (два и более корня):</strong> <em>автовокзал, киностудия, киносъёмка, взаимодействие, главврач, спортинвентарь, искусствовед.</em>
            </div>
            <div>
              5. <strong>ДЕФИС звания / должности:</strong> <em>экс-, вице-, камер-, контр-, лейб-, обер-, статс-, унтер-, флигель-, штаб-, штабс- (штабс-капитан, экс-президент).</em>
            </div>
            <div>
              6. <strong>ДЕФИС имя собств. + родовое понятие:</strong> <em>Москва-река, Уолл-стрит.</em>
            </div>
          </div>
        </div>
      </>
    ),
  },

  /* ==========================================================================
     ЗАДАНИЕ 15: ПРАВОПИСАНИЕ Н И НН (СТР. 84–86)
     ========================================================================== */
  {
    task: '15',
    title: '15 · ПРАВОПИСАНИЕ Н И НН',
    pages: 'стр. 84–86',
    accentVar: 'var(--ios-red)',
    softVar: 'var(--ios-red-soft)',
    keywords:
      'одна н две нн отыменные отглагольные причастия наречия суффиксы ан ян ин енн онн стеклянный оловянный деревянный ветреный безветренный подветренный время временный пламя пламенный ценна ясна юный единый румяный рьяный пьяный синий багряный зеленый вороной свиной фазаний вороний бараний тюлений павлиний олений притяжательные 4 условия приставка ова ева ирова зависимое слово сов вид кованый жеваный клеваный подкованный изжеванный жареный крашеный вареный сушеный краткие причастия решена избалованы судьбой избалованны воспитанник путано раненый израненный раненный в ногу смышленый названый посаженый прощеное верченый ухоженный приверженный невиданный нечаянный неслыханный нежданный негаданный желанный медленный деланный обещанный неожиданный лелеянный долгожданный поистине совершенно необыкновенно немедленно соответственно гостиная гостиница приданое труженик масленица пудреница путаница злоумышленник приверженность настроенность неизменность собственность',
    content: (
      <>
        {/* 1. ОТЫМЕННЫЕ ПРИЛАГАТЕЛЬНЫЕ (ОТ СУЩ., СТР. 84) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-red)' }}>
              1. Отыменные прилагательные (от сущ., стр. 84)
            </div>
            <div className="flex items-center gap-1">
              <BadgeTag label="СУФФИКС + ОСНОВА" tone="orange" />
              <BadgeTag label="Н / НН" tone="red" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            {/* ОДНА Н */}
            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-orange-soft)' }}>
              <div className="font-extrabold text-[12.5px] flex items-center justify-between" style={{ color: 'var(--ios-orange)' }}>
                <span>Пишется одна «Н»:</span>
                <BadgeTag label="1 Н" tone="orange" />
              </div>
              <div>
                1. <strong>В основе нет Н:</strong> <em>мебель + н → мебельный</em>
              </div>
              <div>
                2. <strong>Суффиксы -АН-, -ЯН-, -ИН-:</strong>
                <div className="ml-2 mt-0.5 opacity-90">
                  • <em>глина + ян → глиняный</em><br />
                  • <em>песок + ан → песчаный</em><br />
                  • <em>утка + ин → утиный</em>, <em>соколиный</em>
                </div>
              </div>
              <div className="mt-1 p-1.5 rounded-lg font-semibold" style={{ background: 'rgba(255, 149, 0, 0.15)', border: '0.5px solid rgba(255, 149, 0, 0.35)' }}>
                ⚡ <strong>Исключения (-ЯНН- с двумя НН):</strong><br />
                <em>стеклянный, оловянный, деревянный</em>.
              </div>
            </div>

            {/* ДВЕ НН */}
            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-red-soft)' }}>
              <div className="font-extrabold text-[12.5px] flex items-center justify-between" style={{ color: 'var(--ios-red)' }}>
                <span>Пишется две «НН»:</span>
                <BadgeTag label="НН" tone="red" />
              </div>
              <div>
                1. <strong>Основа на -Н + суффикс -Н-:</strong>
                <div className="ml-2 mt-0.5 opacity-90">
                  • <em>старина + н → старинный</em><br />
                  • <em>туман + н → туманный</em>, <em>картина → картинный</em>
                </div>
              </div>
              <div>
                2. <strong>Суффиксы -ОНН-, -ЕНН-:</strong>
                <div className="ml-2 mt-0.5 opacity-90">
                  • <em>лекция → лекционный</em>, <em>солома → соломенный</em>
                </div>
              </div>
              <div className="p-1.5 rounded-lg font-semibold" style={{ background: 'rgba(255, 59, 48, 0.12)', border: '0.5px solid rgba(255, 59, 48, 0.28)' }}>
                ⚡ <strong>Исключение:</strong> <em>ветреный</em> (день, человек),<br />
                но с приставками пишется НН: <em>безветренный, подветренный</em>.
              </div>
              <div>
                3. <strong>Существительные на -МЯ → НН (-ЕНН-):</strong><br />
                <em>время → временный, пламя → пламенный, семя → семенной, стремя → стременной</em>.
              </div>
              <div>
                4. <strong>Краткие отымённые прил.:</strong> столько же Н, сколько в полных:<br />
                <em>ценная вещь → вещь ценна</em>, <em>ясная даль → даль ясна</em>.
              </div>
            </div>
          </div>

          <MnemonicBox title="❗ 5. ЗАПОМНИ (1 Н): СЛОВАРНЫЕ И ПРИТЯЖАТЕЛЬНЫЕ ПРИЛАГАТЕЛЬНЫЕ">
            <em>юный, единый, румяный, рьяный, пьяный, синий, багряный, зелёный, вороной (чёрный), свиной, фазаний, вороний, бараний, тюлений, павлиний, олений</em> — притяжательные прилагательные ВСЕГДА пишутся с <strong>одной буквой Н</strong>!
          </MnemonicBox>
        </div>

        {/* 2. ОТГЛАГОЛЬНЫЕ ПРИЛ. И ПРИЧАСТИЯ (СТР. 85–86) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-blue)' }}>
              2. Отглагольные прил., причастия, сущ. и наречия (стр. 85–86)
            </div>
            <BadgeTag label="4 УСЛОВИЯ НН" tone="blue" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            {/* 4 УСЛОВИЯ ДЛЯ НН */}
            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold text-[12.5px]" style={{ color: 'var(--ios-red)' }}>
                В полных пишется НН (хотя бы 1 условие):
              </div>
              <div>
                1. <strong>Есть приставка (кроме НЕ-):</strong><br />
                <em>жарить → пережаренный</em>, <em>покрашенный</em>, <em>высушенный</em>.
              </div>
              <div>
                2. <strong>Суффикс -ОВА-, -ЕВА-, -ИРОВА-:</strong><br />
                <em>балованный, асфальтированный, маринованный, организованный</em>.
                <div className="mt-1 p-1 rounded font-semibold text-[11px]" style={{ background: 'var(--ios-orange-soft)', color: 'var(--ios-label)' }}>
                  ❗ <em>Запомни:</em> <strong>кованый, жёваный, клёваный</strong> (-ов-, -ев- в корне!). Но с приставками: <em>подкованный, изжёванный</em> (НН).
                </div>
              </div>
              <div>
                3. <strong>Есть зависимое слово:</strong><br />
                <em>жаренный (на чём?) на масле</em>, <em>вязанный (кем?) бабушкой свитер</em>.
              </div>
              <div>
                4. <strong>От глагола сов. вида (что сделать?):</strong><br />
                <em>решённый (решить)</em>, <em>купленный (купить)</em>, <em>брошенный (бросить)</em>, <em>лишённый (лишить)</em>.
              </div>
            </div>

            {/* 1 Н В ОТГЛАГОЛЬНЫХ */}
            <div className="p-2.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--ios-bg-cell-hover)' }}>
              <div className="font-extrabold text-[12.5px]" style={{ color: 'var(--ios-orange)' }}>
                Ни одного условия нет → 1 Н (отглагольные прил.):
              </div>
              <div>
                Образованы от глаголов несовершенного вида, нет приставок (кроме НЕ-), нет зависимых слов и нет -ОВА-/-ЕВА-:
              </div>
              <div className="p-2 rounded-lg" style={{ background: 'var(--ios-orange-soft)' }}>
                <em>красить → крашеный</em> (но: <em>перекрашенный</em>)<br />
                <em>жарить → жареный</em> (но: <em>пожаренный</em>, <em>жаренный на масле</em>)<br />
                <em>варить → варёный</em>, <em>печь → печёный</em><br />
                <em>сушить → сушёный</em>, <em>вязать → вязаный</em><br />
                <em>путать → путаный ответ</em>, <em>ткать → тканый</em>
              </div>
              <div className="text-[11.5px] opacity-90 mt-1">
                Приставка <strong>НЕ-</strong> не влияет на написание:<br />
                <em>некрашеный пол, незваный гость, нежареная рыба</em> — всё равно одна буква Н.
              </div>
            </div>
          </div>
        </div>

        {/* 3. КРАТКИЕ ФОРМЫ, СУЩ. И НАРЕЧИЯ (СТР. 86) */}
        <div className="cheat-subbox">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="cheat-subbox-title !mb-0" style={{ color: 'var(--ios-purple)' }}>
              3. Краткие формы, сущ. и наречия (стр. 86)
            </div>
            <BadgeTag label="КРАТКИЕ ФОРМЫ" tone="purple" />
          </div>

          <div className="p-2.5 rounded-xl text-[12px] flex flex-col gap-2" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <div className="p-2 rounded-lg" style={{ background: 'var(--ios-blue-soft)' }}>
              <strong style={{ color: 'var(--ios-blue)' }}>• Краткие причастия → ВСЕГДА 1 Н</strong> (можно заменить глаголом):<br />
              <em>решённый → задача решена</em> (задачу решили);<br />
              <em>Вы избалованы судьбой</em> (судьба вас избаловала — кр. причастие).
            </div>

            <div className="p-2 rounded-lg" style={{ background: 'var(--ios-purple-soft)' }}>
              <strong style={{ color: 'var(--ios-purple)' }}>• Краткие отглаг. прил. → столько же Н, сколько в полных</strong> (нельзя заменить глаголом):<br />
              <em>красить → крашеный → комната крашена</em>;<br />
              <em>Дети избалованны</em> (дети капризны, проявляют избалованность — кр. прил.).
            </div>

            <div className="p-2 rounded-lg" style={{ background: 'var(--ios-green-soft)' }}>
              <strong style={{ color: 'var(--ios-green)' }}>• Существительные и наречия на -О / -Е:</strong> пишется столько же Н, сколько в производящем слове:<br />
              <em>воспитать (сов. в.) → воспитанный → воспитанник, воспитанность</em>;<br />
              <em>путать → путаный → путано говорить, путаница</em>;<br />
              <em>трудиться → труженый → труженик</em>;<br />
              <em>гость → гостиный → гостиная, гостиница</em>.
            </div>
          </div>
        </div>

        {/* 4. ЗАПОМИНАЛКИ И СЛОВАРНЫЕ СПИСКИ (СТР. 85–86) */}
        <div className="cheat-subbox">
          <div className="cheat-subbox-title" style={{ color: 'var(--ios-orange)' }}>
            4. Полные списки исключений и словарных слов (стр. 85–86)
          </div>

          <div className="flex flex-col gap-2 text-[12px]">
            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-orange-soft)', border: '0.5px solid rgba(255, 149, 0, 0.32)' }}>
              <div className="font-extrabold text-[12px] uppercase mb-1" style={{ color: 'var(--ios-orange)' }}>
                ❗ Запомни (одна буква Н):
              </div>
              <div className="font-semibold leading-relaxed">
                <em>раненый</em> (но с приставкой или зав. словами: <em>израненный, раненный в ногу солдат</em>), <em>смышлёный ребёнок</em>, <em>названый брат</em> (но: <em>названный в честь деда</em>), <em>посажёный отец</em>, <em>прощёное воскресенье</em>, <em>верчёный</em>.
              </div>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-red-soft)', border: '0.5px solid rgba(255, 59, 48, 0.28)' }}>
              <div className="font-extrabold text-[12px] uppercase mb-1" style={{ color: 'var(--ios-red)' }}>
                ❗ Запомни (две буквы НН):
              </div>
              <div className="font-semibold leading-relaxed">
                <em>ухоженный, приверженный, невиданный, нечаянный, неслыханный, нежданный, негаданный, желанный, медленный, деланный, обещанный, неожиданный, лелеянный, долгожданный</em>.
              </div>
            </div>

            <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-purple-soft)', border: '0.5px solid rgba(175, 82, 222, 0.28)' }}>
              <div className="font-extrabold text-[12px] uppercase mb-1" style={{ color: 'var(--ios-purple)' }}>
                ❗ Запомни (существительные и наречия, стр. 86):
              </div>
              <div className="font-semibold leading-relaxed">
                <em>поистине, совершенно, необыкновенно, немедленно, соответственно, гостиная, гостиница, приданое, труженик, масленица, пудреница, путаница, злоумышленник, приверженность, настроенность, неизменность, собственность</em>.
              </div>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    task: '16',
    title: '16 · ЗНАКИ ПРЕПИНАНИЯ В ССП И ПРИ ОДНОРОДНЫХ ЧЛЕНАХ',
    pages: 'Пунктуация',
    accentVar: 'var(--ios-green)',
    softVar: 'var(--ios-green-soft)',
    keywords: 'ссп однородные члены общий второстепенный член попарное соединение двойные союзы не только но и',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-green)' }}>
          Алгоритм поиска одной запятой в задании № 16
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Когда запятая перед И в ССП НЕ ставится:</strong><br />
            Есть общий второстепенный член в начале предложения (<em>«В лесу было тихо и пахло хвоей»</em>), общее придаточное, общее вводное слово или обе части вопросительные/восклицательные.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Однородные члены:</strong><br />
            • Разные ряды однородных членов (определения + сказуемые) не разделяются запятой.<br />
            • При попарном соединении (<em>А и Б, В и Г</em>) ставится 1 запятая между парами.<br />
            • При двойных союзах (<em>как..., так и...; не только..., но и...</em>) запятая ставится только перед второй частью.
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '17',
    title: '17 · ОБОСОБЛЕННЫЕ ЧЛЕНЫ (ПРИЧАСТНЫЕ И ДЕЕПРИЧАСТНЫЕ ОБОРОТЫ)',
    pages: 'Пунктуация',
    accentVar: 'var(--ios-green)',
    softVar: 'var(--ios-green-soft)',
    keywords: 'причастный деепричастный оборот определяемое слово личное местоимение фразеологизм сломя голову',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-green)' }}>
          Правила обособления определений и обстоятельств (№ 17)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Причастный оборот:</strong><br />
            • ПОСЛЕ определяемого слова — всегда обособляется.<br />
            • ПЕРЕД определяемым существительным — НЕ обособляется (кроме случая с личным местоимением <em>он, она, я, мы</em> или причинным значением).
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Деепричастный оборот:</strong><br />
            • Всегда обособляется независимо от места в предложении.<br />
            • <strong>Исключения:</strong> фразеологизмы (<em>сломя голову, затаив дыхание, спустя рукава</em>) и одиночные наречия (<em>стоя, сидя, молча, нехотя</em>).
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '18',
    title: '18 · ВВОДНЫЕ СЛОВА И ОБРАЩЕНИЯ',
    pages: 'Пунктуация',
    accentVar: 'var(--ios-green)',
    softVar: 'var(--ios-green-soft)',
    keywords: 'вводные слова обращения будто вряд ли едва ли даже именно как будто почти вдруг ведь однако',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-green)' }}>
          Вводные конструкции vs лжевводные частицы (№ 18)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Всегда вводные (выделяются запятыми):</strong><br />
            <em>конечно, разумеется, несомненно, безусловно, кажется, вероятно, возможно, во-первых, итак, следовательно, по-моему, к счастью, к сожалению</em>.
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-red-soft)' }}>
            <strong style={{ color: 'var(--ios-red)' }}>• НИКОГДА не бывают вводными (БЕЗ запятых):</strong><br />
            <em>будто, как будто, вряд ли, едва ли, почти, именно, исключительно, вдруг, ведь, вот, всё-таки, даже, однажды, словно, якобы</em>.
          </div>
        </div>
      </div>
    ),
  },
  {
    task: '19',
    title: '19 · ЗНАКИ ПРЕПИНАНИЯ В СЛОЖНОПОДЧИНЁННОМ ПРЕДЛОЖЕНИИ (СПП)',
    pages: 'Пунктуация',
    accentVar: 'var(--ios-green)',
    softVar: 'var(--ios-green-soft)',
    keywords: 'спп придаточное который союзное слово однородное соподчинение',
    content: (
      <div className="cheat-subbox text-[12px] leading-snug">
        <div className="cheat-subbox-title" style={{ color: 'var(--ios-green)' }}>
          Границы придаточных и союзное слово «КОТОРЫЙ» (№ 19)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Придаточное со словом «КОТОРЫЙ»:</strong><br />
            Запятая ставится на границе главной и придаточной части (например: <em>«дом, (1) крыша (2) которого...»</em> — запятая только на месте 1, перед «которого» на месте 2 запятой нет).
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ios-bg-cell-hover)' }}>
            <strong>• Однородные придаточные:</strong><br />
            Если два придаточных отвечают на один вопрос от одного главного предложения и соединены союзом <strong>И / ИЛИ</strong>, запятая между ними НЕ ставится.
          </div>
        </div>
      </div>
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
      ariaLabel="Полный конспект-шпаргалка ЕГЭ 9–15"
      handleAriaLabel="Потяните вниз, чтобы закрыть шпаргалку"
      sheetClassName="ios-cheatsheet-panel"
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

      <div id="cheat-pills-scroll" className="mb-2.5 shrink-0 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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
            <div className="h-10 shrink-0" aria-hidden="true" />
          </>
        )}
      </div>
    </SwipeableSheet>
  );
});
