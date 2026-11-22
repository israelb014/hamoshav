# המושב

משחק חווה איזומטרי בעברית, יחידני, מימין לשמאל. רץ בדפדפן וכאפליקציית אנדרואיד מאותו קוד.

- **אתר:** https://israelb014.github.io/hamoshav/
- **טכנולוגיה:** TypeScript, Vite, Phaser 3, Capacitor 6 (אנדרואיד), Vitest
- אין שרת, אין חשבונות, אין פרסומות ואין רכישות. הכל נשמר במכשיר.

## הרצה מקומית

```bash
npm install
npm run dev        # http://localhost:5173/hamoshav/
npm test           # בדיקות הלוגיקה (Vitest)
npm run build      # בדיקת TypeScript ובנייה ל-dist/
```

בדיקת קצה לקצה בכרום אמיתי (שתילה → השקיה → קציר → האכלה → מכירה → רענון → "בזמן שלא היית"), כשה-dev server רץ:

```bash
node scripts/e2e.mjs http://localhost:5173/hamoshav/ /tmp 390 844
node scripts/e2e.mjs http://localhost:5173/hamoshav/ /tmp 1400 900
```

הסקריפט משתמש ב-Google Chrome המותקן במחשב, דרך `playwright-core`.

## בניית APK לאנדרואיד

דרישות: JDK 17 ו-Android SDK (platform 34, build-tools 34).

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=$HOME/Android/Sdk
npm run android:apk
```

הפקודה בונה את ה-web עם נתיב יחסי (`BUILD_TARGET=android`), מריצה `cap sync`, מריצה `gradlew assembleDebug` ומעתיקה את הקובץ ל-`hamoshav-debug.apk` בשורש הפרויקט. אם אין `android/local.properties`, צרו אותו עם השורה `sdk.dir=<נתיב ה-SDK>`.

- מזהה חבילה: `com.ibfix.hamoshav`. שם האפליקציה: המושב. מסך לאורך בלבד.
- השמירה נכתבת פעמיים: ל-localStorage ול-Capacitor Preferences, כדי שהמערכת לא תמחק אותה. בטעינה נבחרת השמירה העדכנית מבין השתיים.
- ייצוא שמירה באנדרואיד נכתב לתיקיית המסמכים (Documents).
- את האייקונים ומסכי הפתיחה יוצרים מחדש עם `npm run icons` (צריך dev server רץ). הם נבנים מאותם ספרייטים של המשחק: בית מושב ועץ זית.

## פריסה

כל push ל-`main` מריץ את ה-Action ‏`.github/workflows/pages.yml`: בדיקות, בנייה עם base ‏`/hamoshav/` ופריסה ל-GitHub Pages.

## מבנה התיקיות

```
src/
  sim/        לוגיקת סימולציה טהורה, בלי Phaser ובלי DOM (נבדקת ב-Vitest)
    data.ts       כל הנתונים: גידולים, עצים, חיות, מבנים, קישוטים, מחירים
    state.ts      מבנה השמירה (JSON עם version), מצב התחלתי, migrate, עזרי רשת
    sim.ts        advance(): קידום זמן בצעדים של עד 10 דקות, כולל סימולציה כשלא משחקים
    actions.ts    כל פעולות השחקן (שתילה, קציר, האכלה, קנייה, מכירה...)
    season.ts     עונה לפי תאריך, מזג אוויר כל 6 שעות, שוק שישי
    market.ts     מחירי שוק, ירידה במכירה, חזרה לממוצע
    tasks.ts      משימות יומיות
    level.ts      נוסחת XP
    rng.ts        מחולל אקראי דטרמיניסטי עם seed (נשמר במצב)
  art/        כל הגרפיקה כ-SVG וקטורי בקוד
    palette.ts    הפלטה האחידה
    iso.ts        עזרי ציור איזומטרי (קופסאות, גגות, גדרות)
    sprites.ts    רישום הספרייטים לפי מזהה + החלפה ב-PNG
    icons.ts      אייקוני ממשק SVG
  scenes/     FarmScene.ts: הרינדור ב-Phaser (מצלמה, זום, הקשות, מצב עריכה, מזג אוויר, חיות)
  ui/         ממשק HTML/CSS מעל הקנבס (dir=rtl): HUD, חלוניות, שוק, חנות, הדרכה
  game/       store.ts (חיבור הלוגיקה לממשק), textures.ts (רסטור הספרייטים)
  platform/   save.ts: localStorage, Preferences, ייצוא וייבוא
  assets/fonts/  גופן Heebo מקומי (400/700/900)
tests/        בדיקות Vitest
scripts/      e2e.mjs, gen-icons.mjs, build-apk.mjs, shot.mjs
android/      פרויקט Capacitor לאנדרואיד
art-preview.html  (פיתוח בלבד) תצוגה של כל הספרייטים: /hamoshav/art-preview.html
```

## החלפת גרפיקה (ספרייטים)

כל ספרייט נטען לפי מזהה קבוע. אם קיים הקובץ `public/sprites/<מזהה>.png`, הוא נטען במקום ה-SVG. כך מחליפים ארט בלי לגעת בקוד.

- רשימת הקבצים הקיימים נקראת בזמן build. אחרי הוספת PNG מריצים מחדש `npm run dev` או `npm run build`.
- ה-PNG נמתח לגודל הלוגי של הספרייט (בטבלה למטה), לכן כדאי לשמור על אותו יחס. מומלץ לצייר בגודל כפול לחדות, למשל `bld_house.png` בגודל 512×476.
- נקודת העיגון של ספרייטים איזומטריים היא הקודקוד התחתון של המעוין, באמצע הקצה התחתון של התמונה. חיות מעוגנות ברגליים (90% מהגובה). בועות מעוגנות בחוד התחתון.
- תצוגה של כל הספרייטים: `/hamoshav/art-preview.html` ב-dev server.

### אריחי קרקע (דשא לפי עונה ושביל)

גודל לוגי: 128×64 פיקסלים

`tile_grass_winter_0` `tile_grass_winter_1` `tile_grass_winter_2` `tile_grass_spring_0` `tile_grass_spring_1` `tile_grass_spring_2` `tile_grass_summer_0` `tile_grass_summer_1` `tile_grass_summer_2` `tile_grass_autumn_0` `tile_grass_autumn_1` `tile_grass_autumn_2` `tile_path`

### חלקת שדה יבשה / מושקית

גודל לוגי: 128×72 פיקסלים

`plot_dry` `plot_wet`

### גדר היקפית

גודל לוגי: 128×90 פיקסלים

`fence_x` `fence_y`

### גידולים לפי שלב (0 זרע, 1 נבט, 2 צמיחה, 3 בשל) וצמח נבול

גודל לוגי: 128×108 פיקסלים

`crop_wheat_stage0` `crop_wheat_stage1` `crop_wheat_stage2` `crop_wheat_stage3` `crop_tomato_stage0` `crop_tomato_stage1` `crop_tomato_stage2` `crop_tomato_stage3` `crop_cucumber_stage0` `crop_cucumber_stage1` `crop_cucumber_stage2` `crop_cucumber_stage3` `crop_corn_stage0` `crop_corn_stage1` `crop_corn_stage2` `crop_corn_stage3` `crop_strawberry_stage0` `crop_strawberry_stage1` `crop_strawberry_stage2` `crop_strawberry_stage3` `crop_cauliflower_stage0` `crop_cauliflower_stage1` `crop_cauliflower_stage2` `crop_cauliflower_stage3` `crop_watermelon_stage0` `crop_watermelon_stage1` `crop_watermelon_stage2` `crop_watermelon_stage3` `crop_withered`

### עצי פרי: צעיר / בוגר / עם פרי

גודל לוגי: 128×184 פיקסלים

`tree_olive_young` `tree_olive_mature` `tree_olive_fruit` `tree_orange_young` `tree_orange_mature` `tree_orange_fruit` `tree_date_young` `tree_date_mature` `tree_date_fruit`

### עצי נוף מחוץ לחווה

גודל לוגי: 128×184 פיקסלים

`bgtree_0` `bgtree_1` `bgtree_2`

### חיות (פונות שמאלה)

גודל לוגי: 64×56 פיקסלים

`animal_chicken` `animal_sheep` `animal_goat` `animal_cow`

### מבנים

גודל לוגי: 128×134, 256×198, 256×208, 256×218, 256×238, 256×248 פיקסלים

`bld_house` `bld_coop` `bld_bigcoop` `bld_pen` `bld_barn` `bld_greenhouse` `bld_pump` `bld_tractor`

### קישוטים

גודל לוגי: 128×134 פיקסלים

`deco_bench` `deco_tap` `deco_cart` `deco_geranium` `deco_scarecrow` `deco_sign`

### אייקוני פריטים (מחסן, שוק)

גודל לוגי: 64×64 פיקסלים

`item_wheat` `item_tomato` `item_cucumber` `item_corn` `item_strawberry` `item_cauliflower` `item_watermelon` `item_egg` `item_wool` `item_goatmilk` `item_milk` `item_olive` `item_orange` `item_date`

### בועות סטטוס מעל אובייקטים

גודל לוגי: 72×84 פיקסלים

`bubble_item_wheat` `bubble_item_tomato` `bubble_item_cucumber` `bubble_item_corn` `bubble_item_strawberry` `bubble_item_cauliflower` `bubble_item_watermelon` `bubble_item_egg` `bubble_item_wool` `bubble_item_goatmilk` `bubble_item_milk` `bubble_item_olive` `bubble_item_orange` `bubble_item_date` `bubble_water` `bubble_sick` `bubble_hungry` `bubble_withered`

### אפקטים: ענן, טיפת גשם, שלולית, ניצוץ

גודל לוגי: 240×120, 24×24, 60×26, 6×22 פיקסלים

`fx_cloud` `fx_rain` `fx_puddle` `fx_sparkle`

### סימון מיקום במצב עריכה

גודל לוגי: 128×64, 256×128 פיקסלים

`sel_1_ok` `sel_1_bad` `sel_2_ok` `sel_2_bad`

## החלטות שלא הוגדרו במפרט (בחרתי את הפשוט והאמין)

- **תפוקה:** כל קציר נותן יחידה אחת לגידול ופרי אחד לעץ, ונכנס למחסן. מטבעות מתקבלים רק במכירה בשוק. בקציר עפים ל-HUD אייקון הפריט (למחסן) וכוכב XP. מטבעות עפים במכירה ובקבלת פרס משימה.
- **השקיה:** הקשה על חלקה יבשה עם גידול משקה אותה. שתילה לא משקה אוטומטית. חלקה ריקה מתייבשת גם היא.
- **מלאי התחלתי:** 3 חיטה במחסן, והתרנגולות מתחילות בשובע 60, כדי ששלב "האכל תרנגולת" בהדרכה יעבוד מיד. חיות שנקנות מגיעות בוגרות.
- **צעדי סימולציה:** advance() מתקדם בצעדים של עד 10 דקות, גם במשחק חי וגם כשלא משחקים. אירועים אקראיים (מזג אוויר, תנודות שוק, המלטות) קורים רק בגבולות שעה או משבצת מזג אוויר, ולכן התוצאה דטרמיניסטית עבור seed נתון. מקסימום 7 ימים.
- **מזג אוויר:** משבצות של 6 שעות לפי זמן epoch. בימים ללא גשם או שרב: שמשי או מעונן.
- **מחלה:** אחרי 12 שעות ברעב 0 החיה חולה, הבריאות יורדת 3 לשעה (לא מתחת ל-5) והחיה לא מניבה. ללא מחלה ושובע מעל 20 הבריאות עולה 2 לשעה. טיפול: 30 מטבעות, מרפא ומעלה בריאות ל-80 לפחות.
- **שמחה:** משתנה כל שעה: ‎-2 בסיס, ‎+2 אם המבנה לא מלא, ‎+1 לכל קישוט ברדיוס 3, ‎-2 ברעב, ‎-3 במחלה. ליטוף מוסיף 10 (פעם בשעה). חיה עם שמחה 70 ומעלה מייצרת מהר יותר ב-10%.
- **המלטה:** סיכוי של 10% ליום מחולק לבדיקות שעתיות. גור נולד צעיר וגדל לבוגר תוך 3 ימים. צעירים לא מניבים.
- **שוק:** כל יחידה שנמכרת מורידה את המקדם ב-0.02. כל שעה המקדם זז 0.05 לכיוון 1.0, עם תנודה אקראית של ±0.02. חץ המגמה משווה למקדם של השעה הקודמת.
- **משימות:** 3 משימות מתוך מאגר (קטיף גידול, איסוף תוצרת, מכירה בסכום, האכלה, שתילה) לפי רמה ועונה. פרס: ‎40+15×רמה מטבעות, ‎5+2×רמה XP, ו-30% סיכוי ליהלום.
- **הצבת קניות:** מבנה, עץ, קישוט או חלקה חדשים מוצבים אוטומטית במקום הפנוי הקרוב למרכז, ואפשר להזיז אותם במצב עריכה. אם אין מקום, מוצגת הודעה להרחיב אדמה.
- **גדלי מבנים:** בית, לול, לול גדול, דיר, רפת וחממה תופסים 2×2. משאבה, טרקטור, עצים וקישוטים תופסים 1×1.
- **מחירי קישוטים** (לא הוגדרו): עציץ גרניום 40, ספסל 60, ברז 80, עגלה 120, דחליל 150, שלט 200.
- **טרקטור:** קוצר את כל החלקות הבשלות (כולל בחממות). **משאבה:** משקה רדיוס 3 (מרחק צ'בישב) בכל צעד.
- **זום:** שלוש רמות קבועות (‎0.7, ‎1, ‎1.45 ביחס לזום הבסיסי שמותאם לגודל המסך), עם גלגלת, צביטה או כפתורי +/−.
- **צלילים:** אפקטים מסונתזים ב-WebAudio, בלי קבצים. כבויים כברירת מחדל.
- **הבית:** הקשה עליו פותחת את המשימות.
