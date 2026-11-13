import type { Lang } from './i18n';

/**
 * Translations for content that lives in the database (categories, products,
 * hero slides, hot-deal copy). The interface dictionary in `i18n.ts` covers the
 * UI chrome; these files keep the menu itself readable in every language.
 */
type Dictionary = Record<string, string>;

const fa: Dictionary = {
  /* categories */
  'Beef Burgers': 'برگرهای گوشت',
  'Chicken Burgers': 'برگرهای مرغ',
  'Special Burgers': 'برگرهای ویژه',
  'Combo Meals': 'بسته‌های کمبو',
  Drinks: 'نوشیدنی‌ها',
  Sides: 'کنارغذاها',

  /* badges */
  'Most Popular': 'محبوب‌ترین',
  'Hot Deal': 'پیشنهاد ویژه',
  New: 'جدید',

  /* hero slides */
  'Double The Cheese': 'دو برابر پنیر',
  'Smokehouse Favourite': 'محبوب دودی‌خانه',
  'New On The Menu': 'تازه در منو',
  'Feed The Family': 'برای کل خانواده',
  'Double Cheese Burger': 'دوبل چیز برگر',
  'BBQ Bacon Burger': 'برگر بیکن باربیکیو',
  'Crispy Chicken': 'مرغ ترد',
  'Combo Pack': 'بسته کمبو',
  'Two Patties. Twice The Flavour.': 'دو برگر، دو برابر طعم.',
  'Smoked Bacon & Hickory Glaze': 'بیکن دودی با سس هی‌کوری',
  'Golden Crunch In Every Bite': 'تردی طلایی در هر لقمه',
  'Two Burgers, Fries & Drinks': 'دو برگر، سیب‌زمینی و نوشیدنی',
  'Smashed on the grill, layered with aged cheddar and our secret burger sauce.':
    'روی گریل فشرده شده، با چدار کهنه و سس مخفی برگر.',
  'Crispy onions, smoky bacon and a sticky BBQ glaze you will crave again.':
    'پیاز سرخ‌شده، بیکن دودی و سس غلیظ باربیکیو که دوباره هوسش می‌کنید.',
  'Buttermilk marinated chicken with slaw, pickles and spicy mayo.':
    'مرغ خوابانده در دوغ، با سالاد کلم، خیارشور و مایونز تند.',
  'Our best value bundle — free delivery on every combo order today.':
    'به‌صرفه‌ترین بسته ما — امروز ارسال رایگان برای هر سفارش کمبو.',

  /* hot deal */
  'Two flame-grilled burgers, a generous basket of golden crisp fries and two ice-cold drinks — bundled at our best price of the week.':
    'دو برگر گریل‌شده، سبدی پر از سیب‌زمینی سرخ‌کرده طلایی و دو نوشیدنی یخ — با بهترین قیمت هفته.',

  /* products */
  'Burger House Special': 'برگر ویژه برگر هاوس',
  'Signature beef patty, aged cheddar, house sauce, crisp lettuce and vine tomatoes.':
    'گوشت برگر امضای ما، چدار کهنه، سس مخصوص، کاهو و گوجه تازه.',
  'Two smashed beef patties, double cheddar, pickles and our secret burger sauce.':
    'دو لایه گوشت فشرده، چدار دوبل، خیارشور و سس مخفی برگر.',
  'Flame-grilled beef, smoked bacon, crispy onions and a rich hickory BBQ glaze.':
    'گوشت روی شعله، بیکن دودی، پیاز سرخ‌شده و سس غلیظ باربیکیو هی‌کوری.',
  'Chicken Avocado Burger': 'برگر مرغ و آووکادو',
  'Buttermilk chicken fillet, creamy avocado, baby spinach and lime aioli.':
    'فیله مرغ با دوغ، آووکادوی خامه‌ای، اسفناج جوان و آئولی لیمو.',
  'Classic Beef Burger': 'برگر کلاسیک گوشت',
  'The original — juicy beef, melted cheese, lettuce, tomato and house pickles.':
    'نسخه اصلی — گوشت آبدار، پنیر آب‌شده، کاهو، گوجه و خیارشور خانگی.',
  'Crispy Chicken Burger': 'برگر مرغ ترد',
  'Golden crunchy chicken, slaw, dill pickles and a whisper of spicy mayo.':
    'مرغ طلایی و ترد، سالاد کلم، خیارشور شوید و کمی مایونز تند.',
  'Spicy Jalapeno Burger': 'برگر تند هالاپینو',
  'Beef patty, pepper jack, fresh jalapenos and chipotle sauce for real heat.':
    'گوشت برگر، پنیر پپر جک، هالاپینوی تازه و سس چیپوتله برای تندی واقعی.',
  'Mushroom Swiss Burger': 'برگر قارچ و پنیر سوئیسی',
  'Garlic butter mushrooms, nutty Swiss cheese and truffle mayo on brioche.':
    'قارچ با کره سیر، پنیر سوئیسی و مایونز ترافل روی نان بریوش.',
  'Truffle Smash Burger': 'برگر اسمش ترافل',
  'Double smash patties, caramelised onions and truffle aioli. A house legend.':
    'دو لایه گوشت اسمش، پیاز کاراملی و آئولی ترافل. افسانه این خانه.',
  'Bacon Double Stack': 'دوبل استک بیکن',
  'Two patties stacked with bacon, aged cheddar and smoky burger relish.':
    'دو لایه گوشت با بیکن، چدار کهنه و سس دودی برگر.',
  'Burger House Combo': 'کمبو برگر هاوس',
  'Two signature burgers, golden crisp fries and two ice-cold drinks.':
    'دو برگر امضا، سیب‌زمینی سرخ‌کرده طلایی و دو نوشیدنی یخ.',
  'Crispy Chicken Combo': 'کمبو مرغ ترد',
  'Crispy chicken burger with fries and a soft drink — the lunch favourite.':
    'برگر مرغ ترد با سیب‌زمینی و نوشیدنی — محبوب وقت ناهار.',
  'Golden Crisp Fries': 'سیب‌زمینی سرخ‌کرده طلایی',
  'Hand-cut potatoes, twice fried and lightly sea-salted. Served with dip.':
    'سیب‌زمینی دست‌برش، دو بار سرخ‌شده با نمک دریایی. همراه با سس.',
  'Loaded Cheese Fries': 'سیب‌زمینی با پنیر ویژه',
  'Crispy fries smothered in molten cheddar, bacon bits and spring onion.':
    'سیب‌زمینی ترد غرق در چدار آب‌شده، خرده‌بیکن و پیازچه.',
  'Fizzy Cola': 'کولای گازدار',
  'Ice-cold classic cola, served in a chilled glass with fresh lime.':
    'کولای کلاسیک یخ، در لیوان سرد با لیموی تازه.',
  'Fresh Lemonade': 'لیموناد تازه',
  'Hand-pressed lemons, a hint of mint and just enough sweetness.':
    'لیموی تازه‌فشرده، کمی نعنا و شیرینی به‌اندازه.',
};

const de: Dictionary = {
  'Beef Burgers': 'Rindfleisch-Burger',
  'Chicken Burgers': 'Hähnchen-Burger',
  'Special Burgers': 'Spezial-Burger',
  'Combo Meals': 'Kombi-Menüs',
  Drinks: 'Getränke',
  Sides: 'Beilagen',

  'Most Popular': 'Beliebt',
  'Hot Deal': 'Angebot des Tages',
  New: 'Neu',

  'Double The Cheese': 'Doppelt Käse',
  'Smokehouse Favourite': 'Smokehouse-Liebling',
  'New On The Menu': 'Neu auf der Karte',
  'Feed The Family': 'Für die ganze Familie',
  'Double Cheese Burger': 'Doppelter Cheeseburger',
  'BBQ Bacon Burger': 'BBQ-Bacon-Burger',
  'Crispy Chicken': 'Knuspriges Hähnchen',
  'Combo Pack': 'Combo-Paket',
  'Two Patties. Twice The Flavour.': 'Zwei Patties. Doppelt Geschmack.',
  'Smoked Bacon & Hickory Glaze': 'Geräucherter Bacon & Hickory-Glasur',
  'Golden Crunch In Every Bite': 'Goldene Knusper in jedem Bissen',
  'Two Burgers, Fries & Drinks': 'Zwei Burger, Pommes & Getränke',
  'Smashed on the grill, layered with aged cheddar and our secret burger sauce.':
    'Auf dem Grill zerdrückt, mit gereiftem Cheddar und unserer geheimen Burgersauce.',
  'Crispy onions, smoky bacon and a sticky BBQ glaze you will crave again.':
    'Knusprige Zwiebeln, rauchiger Bacon und eine klebrige BBQ-Glasur, nach der du dich sehnst.',
  'Buttermilk marinated chicken with slaw, pickles and spicy mayo.':
    'In Buttermilch mariniertes Hähnchen mit Krautsalat, Gurken und scharfer Mayo.',
  'Our best value bundle — free delivery on every combo order today.':
    'Unser bestes Angebot — heute kostenlose Lieferung auf jedes Kombi-Menü.',

  'Two flame-grilled burgers, a generous basket of golden crisp fries and two ice-cold drinks — bundled at our best price of the week.':
    'Zwei Burger vom Grill, ein großzügiger Korb goldener Pommes und zwei eiskalte Getränke — zum besten Preis der Woche.',

  'Burger House Special': 'Burger House Spezial',
  'Signature beef patty, aged cheddar, house sauce, crisp lettuce and vine tomatoes.':
    'Unser Signature-Rindfleischpatty, gereifter Cheddar, Haussauce, knackiger Salat und Risentomaten.',
  'Two smashed beef patties, double cheddar, pickles and our secret burger sauce.':
    'Zwei Smash-Patties, doppelter Cheddar, Gurken und unsere geheime Burgersauce.',
  'Flame-grilled beef, smoked bacon, crispy onions and a rich hickory BBQ glaze.':
    'Rindfleisch über der Flamme, geräucherter Bacon, knusprige Zwiebeln und Hickory-BBQ-Glasur.',
  'Chicken Avocado Burger': 'Chicken-Avocado-Burger',
  'Buttermilk chicken fillet, creamy avocado, baby spinach and lime aioli.':
    'Buttermilch-Hähnchenfilet, cremige Avocado, Babyspinat und Limetten-Aioli.',
  'Classic Beef Burger': 'Klassischer Rindfleisch-Burger',
  'The original — juicy beef, melted cheese, lettuce, tomato and house pickles.':
    'Das Original — saftiges Rindfleisch, geschmolzener Käse, Salat, Tomate und hausgemachte Gurken.',
  'Crispy Chicken Burger': 'Knuspriger Hähnchen-Burger',
  'Golden crunchy chicken, slaw, dill pickles and a whisper of spicy mayo.':
    'Goldbraun knuspriges Hähnchen, Krautsalat, Dillgurken und ein Hauch scharfer Mayo.',
  'Spicy Jalapeno Burger': 'Spicy-Jalapeño-Burger',
  'Beef patty, pepper jack, fresh jalapenos and chipotle sauce for real heat.':
    'Rindfleischpatty, Pepper Jack, frische Jalapeños und Chipotle-Sauce für echte Schärfe.',
  'Mushroom Swiss Burger': 'Pilz-Swiss-Burger',
  'Garlic butter mushrooms, nutty Swiss cheese and truffle mayo on brioche.':
    'Champignons in Knoblauchbutter, würziger Schweizer Käse und Trüffelmayo auf Brioche.',
  'Truffle Smash Burger': 'Trüffel-Smash-Burger',
  'Double smash patties, caramelised onions and truffle aioli. A house legend.':
    'Doppelte Smash-Patties, karamellisierte Zwiebeln und Trüffel-Aioli. Eine Hauslegende.',
  'Bacon Double Stack': 'Bacon-Doppel-Stack',
  'Two patties stacked with bacon, aged cheddar and smoky burger relish.':
    'Zwei Patties mit Bacon, gereiftem Cheddar und rauchigem Burger-Relish.',
  'Burger House Combo': 'Burger-House-Combo',
  'Two signature burgers, golden crisp fries and two ice-cold drinks.':
    'Zwei Signature-Burger, goldene Pommes und zwei eiskalte Getränke.',
  'Crispy Chicken Combo': 'Knuspriges Hähnchen-Combo',
  'Crispy chicken burger with fries and a soft drink — the lunch favourite.':
    'Knuspriger Hähnchen-Burger mit Pommes und Softdrink — der Mittagsfavorit.',
  'Golden Crisp Fries': 'Goldene Knusper-Pommes',
  'Hand-cut potatoes, twice fried and lightly sea-salted. Served with dip.':
    'Handgeschnittene Kartoffeln, zweimal frittiert und leicht mit Meersalz. Mit Dip.',
  'Loaded Cheese Fries': 'Cheese-Pommes Deluxe',
  'Crispy fries smothered in molten cheddar, bacon bits and spring onion.':
    'Knusprige Pommes in geschmolzenem Cheddar, Baconstreifen und Frühlingszwiebeln.',
  'Fizzy Cola': 'Sprudel-Cola',
  'Ice-cold classic cola, served in a chilled glass with fresh lime.':
    'Eiskalte klassische Cola im gekühlten Glas mit frischer Limette.',
  'Fresh Lemonade': 'Frische Limonade',
  'Hand-pressed lemons, a hint of mint and just enough sweetness.':
    'Handgepresste Zitronen, ein Hauch Minze und genau die richtige Süße.',
};

const fr: Dictionary = {
  'Beef Burgers': 'Burgers au bœuf',
  'Chicken Burgers': 'Burgers au poulet',
  'Special Burgers': 'Burgers spéciaux',
  'Combo Meals': 'Menus combo',
  Drinks: 'Boissons',
  Sides: 'Accompagnements',

  'Most Popular': 'Populaire',
  'Hot Deal': 'Offre du jour',
  New: 'Nouveau',

  'Double The Cheese': 'Double fromage',
  'Smokehouse Favourite': 'Le favori du fumoir',
  'New On The Menu': 'Nouveau à la carte',
  'Feed The Family': 'Pour toute la famille',
  'Double Cheese Burger': 'Double cheeseburger',
  'BBQ Bacon Burger': 'Burger BBQ bacon',
  'Crispy Chicken': 'Poulet croustillant',
  'Combo Pack': 'Menu combo',
  'Two Patties. Twice The Flavour.': 'Deux steaks. Deux fois plus de saveur.',
  'Smoked Bacon & Hickory Glaze': 'Bacon fumé & glaçage hickory',
  'Golden Crunch In Every Bite': 'Du croquant doré à chaque bouchée',
  'Two Burgers, Fries & Drinks': 'Deux burgers, frites & boissons',
  'Smashed on the grill, layered with aged cheddar and our secret burger sauce.':
    'Écrasé sur le grill, nappé de cheddar affiné et de notre sauce secrète.',
  'Crispy onions, smoky bacon and a sticky BBQ glaze you will crave again.':
    'Oignons croustillants, bacon fumé et un glaçage BBQ collant qui donne envie de revenir.',
  'Buttermilk marinated chicken with slaw, pickles and spicy mayo.':
    'Poulet mariné au babeurre, salade de chou, cornichons et mayonnaise épicée.',
  'Our best value bundle — free delivery on every combo order today.':
    'Notre formule la plus avantageuse — livraison offerte sur chaque menu combo aujourd’hui.',

  'Two flame-grilled burgers, a generous basket of golden crisp fries and two ice-cold drinks — bundled at our best price of the week.':
    'Deux burgers grillés à la flamme, un généreux panier de frites dorées et deux boissons glacées — au meilleur prix de la semaine.',

  'Burger House Special': 'Le Spécial Burger House',
  'Signature beef patty, aged cheddar, house sauce, crisp lettuce and vine tomatoes.':
    'Notre steak haché signature, cheddar affiné, sauce maison, laitue croquante et tomates grappe.',
  'Two smashed beef patties, double cheddar, pickles and our secret burger sauce.':
    'Deux steaks smashés, double cheddar, cornichons et notre sauce secrète.',
  'Flame-grilled beef, smoked bacon, crispy onions and a rich hickory BBQ glaze.':
    'Bœuf grillé à la flamme, bacon fumé, oignons croustillants et glaçage BBQ hickory.',
  'Chicken Avocado Burger': 'Burger poulet avocat',
  'Buttermilk chicken fillet, creamy avocado, baby spinach and lime aioli.':
    'Filet de poulet au babeurre, avocat crémeux, pousses d’épinard et aïoli au citron vert.',
  'Classic Beef Burger': 'Burger bœuf classique',
  'The original — juicy beef, melted cheese, lettuce, tomato and house pickles.':
    'L’original — bœuf juteux, fromage fondu, laitue, tomate et cornichons maison.',
  'Crispy Chicken Burger': 'Burger poulet croustillant',
  'Golden crunchy chicken, slaw, dill pickles and a whisper of spicy mayo.':
    'Poulet doré et croustillant, salade de chou, cornichons à l’aneth et une touche de mayo épicée.',
  'Spicy Jalapeno Burger': 'Burger jalapeño épicé',
  'Beef patty, pepper jack, fresh jalapenos and chipotle sauce for real heat.':
    'Steak haché, pepper jack, jalapeños frais et sauce chipotle pour un vrai piquant.',
  'Mushroom Swiss Burger': 'Burger champignons suisse',
  'Garlic butter mushrooms, nutty Swiss cheese and truffle mayo on brioche.':
    'Champignons au beurre d’ail, fromage suisse et mayo à la truffe sur brioche.',
  'Truffle Smash Burger': 'Burger smash à la truffe',
  'Double smash patties, caramelised onions and truffle aioli. A house legend.':
    'Double steak smashé, oignons caramélisés et aïoli à la truffe. Une légende de la maison.',
  'Bacon Double Stack': 'Double stack bacon',
  'Two patties stacked with bacon, aged cheddar and smoky burger relish.':
    'Deux steaks empilés avec bacon, cheddar affiné et relish fumée.',
  'Burger House Combo': 'Menu Burger House',
  'Two signature burgers, golden crisp fries and two ice-cold drinks.':
    'Deux burgers signature, frites dorées et deux boissons glacées.',
  'Crispy Chicken Combo': 'Menu poulet croustillant',
  'Crispy chicken burger with fries and a soft drink — the lunch favourite.':
    'Burger poulet croustillant avec frites et boisson — le favori du déjeuner.',
  'Golden Crisp Fries': 'Frites dorées croustillantes',
  'Hand-cut potatoes, twice fried and lightly sea-salted. Served with dip.':
    'Pommes de terre coupées à la main, doublement frites et légèrement salées. Avec sauce.',
  'Loaded Cheese Fries': 'Frites au cheddar fondu',
  'Crispy fries smothered in molten cheddar, bacon bits and spring onion.':
    'Frites croustillantes nappées de cheddar fondu, éclats de bacon et ciboule.',
  'Fizzy Cola': 'Cola pétillant',
  'Ice-cold classic cola, served in a chilled glass with fresh lime.':
    'Cola classique glacé, servi dans un verre frais avec citron vert.',
  'Fresh Lemonade': 'Limonade fraîche',
  'Hand-pressed lemons, a hint of mint and just enough sweetness.':
    'Citrons pressés à la main, une pointe de menthe et juste ce qu’il faut de douceur.',
};

const it: Dictionary = {
  'Beef Burgers': 'Burger di manzo',
  'Chicken Burgers': 'Burger di pollo',
  'Special Burgers': 'Burger speciali',
  'Combo Meals': 'Menu combo',
  Drinks: 'Bevande',
  Sides: 'Contorni',

  'Most Popular': 'Più popolare',
  'Hot Deal': 'Offerta del giorno',
  New: 'Novità',

  'Double The Cheese': 'Doppio formaggio',
  'Smokehouse Favourite': 'Il preferito dello smokehouse',
  'New On The Menu': 'Novità in menu',
  'Feed The Family': 'Per tutta la famiglia',
  'Double Cheese Burger': 'Doppio cheeseburger',
  'BBQ Bacon Burger': 'Burger BBQ bacon',
  'Crispy Chicken': 'Pollo croccante',
  'Combo Pack': 'Combo',
  'Two Patties. Twice The Flavour.': 'Due hamburger. Il doppio del gusto.',
  'Smoked Bacon & Hickory Glaze': 'Bacon affumicato & glassa hickory',
  'Golden Crunch In Every Bite': 'Croccantezza dorata a ogni morso',
  'Two Burgers, Fries & Drinks': 'Due burger, patatine & bevande',
  'Smashed on the grill, layered with aged cheddar and our secret burger sauce.':
    'Schiacciato sulla griglia, con cheddar stagionato e la nostra salsa segreta.',
  'Crispy onions, smoky bacon and a sticky BBQ glaze you will crave again.':
    'Cipolle croccanti, bacon affumicato e una glassa BBQ appiccicosa che vorrai ancora.',
  'Buttermilk marinated chicken with slaw, pickles and spicy mayo.':
    'Pollo marinato al latticello, insalata di cavolo, cetriolini e maionese piccante.',
  'Our best value bundle — free delivery on every combo order today.':
    'La nostra offerta più conveniente — consegna gratuita su ogni combo oggi.',

  'Two flame-grilled burgers, a generous basket of golden crisp fries and two ice-cold drinks — bundled at our best price of the week.':
    'Due burger alla fiamma, un generoso cestino di patatine dorate e due bevande ghiacciate — al miglior prezzo della settimana.',

  'Burger House Special': 'Speciale Burger House',
  'Signature beef patty, aged cheddar, house sauce, crisp lettuce and vine tomatoes.':
    'Il nostro hamburger di manzo signature, cheddar stagionato, salsa della casa, lattuga croccante e pomodori.',
  'Two smashed beef patties, double cheddar, pickles and our secret burger sauce.':
    'Due hamburger schiacciati, doppio cheddar, sottaceti e la nostra salsa segreta.',
  'Flame-grilled beef, smoked bacon, crispy onions and a rich hickory BBQ glaze.':
    'Manzo alla fiamma, bacon affumicato, cipolle croccanti e glassa BBQ hickory.',
  'Chicken Avocado Burger': 'Burger pollo e avocado',
  'Buttermilk chicken fillet, creamy avocado, baby spinach and lime aioli.':
    'Filetto di pollo al latticello, avocado cremoso, spinacino e aioli al lime.',
  'Classic Beef Burger': 'Burger di manzo classico',
  'The original — juicy beef, melted cheese, lettuce, tomato and house pickles.':
    'L’originale — manzo succoso, formaggio fuso, lattuga, pomodoro e sottaceti della casa.',
  'Crispy Chicken Burger': 'Burger di pollo croccante',
  'Golden crunchy chicken, slaw, dill pickles and a whisper of spicy mayo.':
    'Pollo dorato e croccante, insalata di cavolo, cetriolini all’aneto e un tocco di maionese piccante.',
  'Spicy Jalapeno Burger': 'Burger jalapeño piccante',
  'Beef patty, pepper jack, fresh jalapenos and chipotle sauce for real heat.':
    'Hamburger di manzo, pepper jack, jalapeños freschi e salsa chipotle per un vero piccante.',
  'Mushroom Swiss Burger': 'Burger funghi e formaggio svizzero',
  'Garlic butter mushrooms, nutty Swiss cheese and truffle mayo on brioche.':
    'Funghi al burro d’aglio, formaggio svizzero e maionese al tartufo su brioche.',
  'Truffle Smash Burger': 'Burger smash al tartufo',
  'Double smash patties, caramelised onions and truffle aioli. A house legend.':
    'Doppio hamburger schiacciato, cipolle caramellate e aioli al tartufo. Una leggenda della casa.',
  'Bacon Double Stack': 'Doppio stack bacon',
  'Two patties stacked with bacon, aged cheddar and smoky burger relish.':
    'Due hamburger impilati con bacon, cheddar stagionato e salsa affumicata.',
  'Burger House Combo': 'Combo Burger House',
  'Two signature burgers, golden crisp fries and two ice-cold drinks.':
    'Due burger signature, patatine dorate e due bevande ghiacciate.',
  'Crispy Chicken Combo': 'Combo pollo croccante',
  'Crispy chicken burger with fries and a soft drink — the lunch favourite.':
    'Burger di pollo croccante con patatine e bibita — il preferito del pranzo.',
  'Golden Crisp Fries': 'Patatine croccanti dorate',
  'Hand-cut potatoes, twice fried and lightly sea-salted. Served with dip.':
    'Patate tagliate a mano, fritte due volte e leggermente salate. Con salsa.',
  'Loaded Cheese Fries': 'Patatine cariche al cheddar',
  'Crispy fries smothered in molten cheddar, bacon bits and spring onion.':
    'Patatine croccanti ricoperte di cheddar fuso, dadini di bacon e cipollotto.',
  'Fizzy Cola': 'Cola frizzante',
  'Ice-cold classic cola, served in a chilled glass with fresh lime.':
    'Cola classica ghiacciata, servita in un bicchiere freddo con lime fresco.',
  'Fresh Lemonade': 'Limonata fresca',
  'Hand-pressed lemons, a hint of mint and just enough sweetness.':
    'Limoni spremuti a mano, un tocco di menta e la giusta dolcezza.',
};

export const CONTENT: Record<Exclude<Lang, 'en'>, Dictionary> = { fa, de, fr, it };
