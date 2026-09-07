(function () {
  var wordGridEl = document.getElementById('itWordGrid');
  if (!wordGridEl) return;

  var historyEl = document.getElementById('itHistory');
  var orderHintEl = document.getElementById('itOrderHint');
  var orderSymbolsEl = document.getElementById('itOrderSymbols');
  var answerSymbolsEl = document.getElementById('itAnswerSymbols');
  var orderFeedbackEl = document.getElementById('itOrderFeedback');
  var seenSymbolsEl = document.getElementById('itSeenSymbols');
  var logEl = document.getElementById('itLog');
  var decoderGridEl = document.getElementById('itDecoderGrid');
  var notesFloatEl = document.getElementById('itNotesFloat');
  var notesFloatHeaderEl = document.getElementById('itNotesFloatHeader');
  var notesFloatMinBtn = document.getElementById('itNotesFloatMin');
  var menuListEl = document.getElementById('itMenuList');
  var menuHintEl = document.getElementById('itMenuHint');
  var selectedCountEl = document.getElementById('itSelectedCount');
  var askBtn = document.getElementById('itAskBtn');
  var timerValueEl = document.getElementById('itTimerValue');
  var timerWrapEl = document.getElementById('itTimer');
  var progressEl = document.getElementById('itProgress');
  var restartBtn = document.getElementById('itRestart');
  var overlayEl = document.getElementById('itOverlay');
  var overlayTitleEl = document.getElementById('itOverlayTitle');
  var overlayTextEl = document.getElementById('itOverlayText');
  var overlayRestartBtn = document.getElementById('itOverlayRestart');
  var symbolPickerEl = document.getElementById('itSymbolPicker');
  var symbolPickerTagEl = document.getElementById('itSymbolPickerTag');
  var symbolPickerGridEl = document.getElementById('itSymbolPickerGrid');
  var symbolPickerClearBtn = document.getElementById('itSymbolPickerClear');
  var symbolPickerCloseBtn = document.getElementById('itSymbolPickerClose');

  var MAX_ASK_WORDS = 4;
  var TARGET_COUNT = 3;
  var ASKS_PER_GUESS = 3;

  var TAGS = [
    'Sweet', 'Sour', 'Bitter', 'Salty', 'Spicy', 'Savory', 'Earthy', 'Nutty',
    'Creamy', 'Fruity', 'Floral', 'Smoky', 'Rich',
    'Food', 'Drink', 'Spice/Condiment',
    'Red', 'Orange', 'Yellow', 'Green', 'Brown', 'White', 'Purple', 'Black', 'Clear'
  ];

  var WORDS = [
    { name: 'Lemonade', tags: ['Sour', 'Sweet', 'Drink', 'Yellow'] },
    { name: 'Cherry', tags: ['Sweet', 'Fruity', 'Food', 'Red'] },
    { name: 'Basil', tags: ['Earthy', 'Floral', 'Spice/Condiment', 'Green'] },
    { name: 'Chili', tags: ['Spicy', 'Savory', 'Spice/Condiment', 'Red'] },
    { name: 'Walnut', tags: ['Nutty', 'Earthy', 'Brown'] },
    { name: 'Cream', tags: ['Creamy', 'Sweet', 'White', 'Rich'] },
    { name: 'Charcoal', tags: ['Smoky', 'Bitter', 'Black'] },
    { name: 'Sea Salt', tags: ['Salty', 'Savory', 'Spice/Condiment', 'White'] },
    { name: 'Ginger', tags: ['Spicy', 'Sweet', 'Spice/Condiment', 'Brown'] },
    { name: 'Mushroom', tags: ['Earthy', 'Savory', 'Food', 'Brown'] },
    { name: 'Grapefruit', tags: ['Sour', 'Bitter', 'Fruity', 'Orange'] },
    { name: 'Almond', tags: ['Nutty', 'Sweet', 'Food', 'Brown'] },
    { name: 'Vinegar', tags: ['Sour', 'Savory', 'Spice/Condiment', 'Clear'] },
    { name: 'Rose', tags: ['Floral', 'Sweet', 'Red'] },
    { name: 'Coffee', tags: ['Earthy', 'Bitter', 'Drink', 'Brown', 'Rich'] },
    { name: 'Coconut', tags: ['Creamy', 'Sweet', 'Fruity', 'Rich'] },
    { name: 'Peppercorn', tags: ['Spicy', 'Earthy', 'Spice/Condiment', 'Black'] },
    { name: 'Caramel', tags: ['Sweet', 'Bitter', 'Brown', 'Rich'] },
    { name: 'Anchovy', tags: ['Salty', 'Savory', 'Food', 'Black'] },
    { name: 'Mint', tags: ['Floral', 'Bitter', 'Green'] },
    { name: 'Truffle', tags: ['Earthy', 'Savory', 'Black'] },
    { name: 'Berry', tags: ['Sweet', 'Sour', 'Fruity', 'Food', 'Purple'] },
    { name: 'Smoked Paprika', tags: ['Smoky', 'Spicy', 'Food', 'Spice/Condiment', 'Red'] },
    { name: 'Wine', tags: ['Fruity', 'Bitter', 'Drink', 'Purple', 'Rich'] },
    { name: 'Tea', tags: ['Floral', 'Bitter', 'Drink', 'Brown'] }
  ];

  var MENU = [
    { name: 'Lasagna', tags: ['Savory', 'Earthy', 'Creamy', 'Rich', 'Red', 'Food'], desc: 'Layers of pasta, meat sauce, and melted cheese, baked until rich and bubbling.', img: 'lasagna.jpg' },
    { name: 'Steak and Eggs', tags: ['Savory', 'Salty', 'Rich', 'Brown', 'Food'], desc: 'A savory seared steak served alongside eggs, cooked your way.', img: 'steakandeggs.jpg' },
    { name: 'Supreme Pizza', tags: ['Savory', 'Spicy', 'Salty', 'Red', 'Food'], desc: 'Loaded with pepperoni, sausage, and peppers, with a spicy kick in every slice.', img: 'supremepizza.jpg' },
    { name: 'Buffalo Wings', tags: ['Spicy', 'Savory', 'Rich', 'Orange', 'Food'], desc: 'Crispy wings tossed in a spicy buffalo sauce, served hot.', img: 'buffalowings.jpg' },
    { name: 'Caesar Salad', tags: ['Savory', 'Salty', 'Creamy', 'Green', 'Food'], desc: 'Crisp romaine tossed in a creamy Caesar dressing with parmesan and croutons.', img: 'caesarsalad.jpg' },
    { name: 'Mushroom Risotto', tags: ['Earthy', 'Creamy', 'Savory', 'Rich', 'Brown', 'Food'], desc: 'Slow-stirred rice with mushrooms, finished creamy and earthy.', img: 'mushroomrisotto.jpg' },
    { name: 'Chocolate Lava Cake', tags: ['Sweet', 'Bitter', 'Rich', 'Brown', 'Food'], desc: 'A warm chocolate cake with a molten center — sweet, rich, and just a little bitter.', img: 'chocolatelava.jpg' },
    { name: 'Grilled Salmon', tags: ['Savory', 'Smoky', 'Rich', 'Orange', 'Food'], desc: 'Grilled over an open flame for a smoky, rich finish.', img: 'grilledsalmon.jpg' },
    { name: 'Key Lime Pie', tags: ['Sour', 'Sweet', 'Fruity', 'Green', 'Food'], desc: 'A sour-sweet lime filling on a crumbling graham crust.', img: 'keylimepie.jpg' },
    { name: 'Old Fashioned', tags: ['Bitter', 'Sweet', 'Smoky', 'Brown', 'Drink'], desc: 'Whiskey and sugar with a bitter dash of bitters, finished smoky from the char.', img: 'oldfashioned.jpg' },
    { name: 'Bloody Mary', tags: ['Savory', 'Spicy', 'Salty', 'Red', 'Drink'], desc: 'A savory tomato cocktail with a spicy, salty kick.', img: 'bloodymary.jpg' },
    { name: 'Mimosa', tags: ['Sour', 'Sweet', 'Fruity', 'Orange', 'Drink'], desc: 'Sparkling wine and sweet orange juice, light and fruity.', img: 'mimosa.jpg' },
    { name: 'Irish Coffee', tags: ['Bitter', 'Sweet', 'Rich', 'Brown', 'Drink'], desc: 'Hot coffee with whiskey and cream, rich and just sweet enough.', img: 'irishcoffee.jpg' },
    { name: 'Piña Colada', tags: ['Sweet', 'Creamy', 'Fruity', 'White', 'Drink'], desc: 'A creamy, sweet blend of coconut and pineapple.', img: 'pinacolada.jpg' },
    { name: 'Whiskey Sour', tags: ['Sour', 'Sweet', 'Bitter', 'Brown', 'Drink'], desc: 'Whiskey shaken with lemon for a sharp, sour finish.', img: 'whiskeysour.jpg' },
    { name: 'Hot Sauce', tags: ['Spicy', 'Savory', 'Red', 'Spice/Condiment', 'Food'], desc: 'A spicy, savory condiment — a few drops go a long way.', img: 'hotsauce.jpg' },
    { name: 'Garlic Butter', tags: ['Savory', 'Rich', 'Creamy', 'Yellow', 'Spice/Condiment', 'Food'], desc: 'A rich, savory butter that melts into whatever it touches.', img: 'garlicbutter.jpg' },
    { name: 'Pico de Gallo', tags: ['Spicy', 'Savory', 'Sour', 'Red', 'Spice/Condiment', 'Food'], desc: 'Fresh chopped tomato and onion with a spicy, sour bite.', img: 'picodegallo.jpg' },
    { name: 'Whole Grain Mustard', tags: ['Savory', 'Sour', 'Spicy', 'Brown', 'Spice/Condiment', 'Food'], desc: 'A coarse, sour mustard with a spicy bite.', img: 'wholegrainmustard.jpg' },
    { name: 'Pesto Pasta', tags: ['Nutty', 'Earthy', 'Floral', 'Green', 'Food'], desc: 'Pasta tossed in a nutty, earthy basil pesto.', img: 'pestopasta.jpg' },
    { name: 'Blueberry Cobbler', tags: ['Sweet', 'Fruity', 'Purple', 'Rich', 'Food'], desc: 'Warm, sweet blueberries under a golden, rich crust.', img: 'blueberrycobbler.jpg' },
    { name: 'Squid Ink Pasta', tags: ['Savory', 'Salty', 'Black', 'Food'], desc: 'A savory, salty pasta dyed black with squid ink.', img: 'squidinkpasta.jpg' },
    { name: 'Vanilla Milkshake', tags: ['Sweet', 'Creamy', 'Rich', 'White', 'Drink'], desc: 'A thick, creamy vanilla shake, sweet and rich.', img: 'vanillamilkshake.jpg' },
    { name: 'Mac and Cheese', tags: ['Savory', 'Creamy', 'Rich', 'Orange', 'Food'], desc: 'Pasta baked in a creamy, savory cheese sauce.', img: 'macandcheese.jpg' },
    { name: 'BBQ Ribs', tags: ['Smoky', 'Savory', 'Sweet', 'Brown', 'Food'], desc: 'Ribs slow-cooked over smoke, savory and sweet.', img: 'bbqribs.jpg' }
  ];

  var SYMBOL_ICONS = [
    '<path fill="currentColor" d="m13 21l.85-8.275q-1.425-.375-2.15-.987T10.25 10.4l-2.375 2.35L10 14.875V21H8v-5.25l-.775-.7l.175 1.35l-3.675 4.725L2.15 19.9l3.15-4.05l-2.075-4.1l4.2-4.15q.3-.3.662-.45T8.825 7q.6 0 .95.225t.475.35l2 1.975q.675.675 1.65 1.062T16 11h2.975l.8 7.7q.325.2.525.538t.2.762q0 .625-.438 1.063T19 21.5t-1.075-.437t-.45-1.063q0-.425.2-.763t.55-.537l-.125-1.2h-3.25L14.5 21zm-.5-13.5q-.825 0-1.412-.587T10.5 5.5t.588-1.412T12.5 3.5t1.413.588T14.5 5.5t-.587 1.413T12.5 7.5M15 16h2.95l-.35-3.5h-2.225z"/>',
    '<path fill="currentColor" d="m19.8 22.6l-4.2-4.2L12 22h-1v-7.6L6.4 19L5 17.6l4.9-4.9l-8.5-8.5l1.4-1.4l18.4 18.4zM13 18.15L14.15 17L13 15.85zm1.1-6.85l-1.4-1.4l2.2-2.2L13 5.85v4.35l-2-2V2h1l5.7 5.7z"/>',
    '<path fill="currentColor" d="M4.65 22q-1.35 0-2-.55T2 19.8q0-1.45 1.225-1.85t2.9-.4h.525v-1.4q0-.85-.025-1.387t-.15-.888t-.287-.487t-.438-.138q-.225 0-.413.075t-.312.2q-.1.125-.125.262t.025.288q.15.275.35.537t.2.613q0 .625-.437 1.062t-1.063.438t-1.062-.437t-.438-1.063q0-.675.3-1.1t.813-.675t1.187-.35t1.45-.1q2.125 0 2.95.763T10 16.45v3.675q0 .475.113.7t.387.225q.3 0 .488-.45t.237-1.4h.275q-.075 1.55-.587 2.175T9.2 22q-1.075 0-1.687-.337t-.788-1.013q-.25.725-.737 1.038T4.65 22m9.325 0q-.5 0-.812-.413t-.113-.887l2.55-6.725q.175-.425.55-.7T17 13t.85.275t.55.7l2.55 6.725q.2.475-.112.888t-.813.412q-.3 0-.55-.175t-.375-.475l-.5-1.45h-3.2l-.5 1.45q-.1.275-.35.463t-.575.187m-8.1-.725q.325 0 .55-.513t.225-1.237V17.85q-.65 0-.95.387T5.4 19.5v.275q0 .9.1 1.2t.375.3M16.05 18.15h1.925L17 15.3zm-.925-7.125q-1.2 0-1.912-.838T12.5 7.925q0-2.6 1.65-4.262T18.375 2q1.05 0 1.7.238t.65.612q0 .15-.05.3t-.175.275q-.125.175-.313.25T19.8 3.7q-.35-.1-.8-.175t-.825-.075q-1.775 0-2.85 1.2T14.25 7.825q0 .55.2 1.15t.9.6q.275 0 .537-.125t.463-.35q.425-.45.787-1.5t.663-2.55q.05-.325.263-.462t.587-.138q.45 0 .688.238t.137.587q-.3 1.075-.437 1.875T18.9 8.6q0 .5.138.725t.412.225t.538-.2t.737-.75q.05-.075.375-.175q.2 0 .3.15t.1.425q0 .7-.8 1.35t-1.675.65q-.65 0-1.112-.35t-.638-1q-.375.65-.925 1.013t-1.225.362M3 11V5.5q0-1.45 1.025-2.475T6.5 2t2.475 1.025T10 5.5V11H8V9H5v2zm2-4h3V5.5q0-.625-.437-1.062T6.5 4t-1.062.438T5 5.5z"/>',
    '<path fill="currentColor" d="M11 3.925L8.925 6H6v2.925L3.925 11L6 13.075V16h2.925L11 18.075l2.5-2.5l4.2 2.125l-2.15-4.175L18.075 11L16 8.925V6h-2.925zM11 1.1L13.9 4H18v4.1l2.9 2.9l-2.9 2.9l2.875 5.65q.175.325.1.638t-.275.512t-.512.275t-.638-.1L13.9 18L11 20.9L8.1 18H4v-4.1L1.1 11L4 8.1V4h4.1zm0 9.9"/>',
    '<path fill="currentColor" d="m12 10.85l5.925-3.425L12 4L6.075 7.425zm-9 6.275V6.875L12 1.7l9 5.175V12h-2V9.1l-7.025 4.05L5 9.1v6.85l6.025 3.475v2.3zM18 22q.2 0 .35-.15t.15-.35t-.15-.35T18 21t-.35.15t-.15.35t.15.35t.35.15m-.5-2h1v-4h-1zm-3.037 2.538Q13 21.075 13 19t1.463-3.537T18 14t3.538 1.463T23 19t-1.463 3.538T18 24t-3.537-1.463m-3.438-10.812"/>',
    '<path fill="currentColor" d="M3 21q-.2 0-.387-.088T2.3 20.7q-.3-.275-.3-.687t.275-.713q.475-.5 1.138-.6t1.337.025q.2.05.375.1t.3-.075q.15-.15.113-.375t-.088-.425q-.1-.675-.025-1.338t.55-1.162t1.137-.6t1.338.025q.2.05.388.1t.312-.075q.15-.15.1-.375t-.1-.425q-.1-.675-.025-1.337t.55-1.163t1.137-.6t1.338.025q.2.05.387.1t.313-.075q.15-.15.1-.375t-.1-.425q-.1-.675-.013-1.337T13.4 7.75t1.138-.6t1.337.025q.2.05.388.1t.312-.075q.15-.15.1-.375t-.1-.425q-.1-.675-.012-1.338t.562-1.162t1.138-.6t1.337.025q.2.05.387.088t.313-.088q.275-.3.688-.3t.712.275t.3.688t-.275.712q-.475.5-1.137.613T19.25 5.3q-.2-.05-.387-.1t-.313.075q-.15.15-.1.375t.1.425q.1.675.013 1.338T18 8.575t-1.137.6t-1.338-.025q-.2-.05-.375-.1t-.3.075q-.15.15-.112.375t.087.425q.1.675.025 1.338t-.55 1.162q-.475.475-1.137.588T11.825 13q-.2-.05-.375-.088t-.3.088q-.15.15-.112.363t.087.412q.1.675.025 1.338t-.55 1.162t-1.15.6t-1.35-.025q-.2-.05-.375-.087t-.3.087q-.15.15-.1.363t.1.412q.1.675.013 1.338t-.563 1.162t-1.137.6T4.4 20.7q-.2-.05-.375-.087t-.3.087q-.15.15-.338.225T3 21m3-10q-2.075 0-3.537-1.462T1 6q0-2.1 1.463-3.55T6 1q2.1 0 3.55 1.45T11 6q0 2.075-1.45 3.538T6 11m10 12q-.825 0-1.412-.587T14 21v-5q0-.825.588-1.412T16 14h5q.825 0 1.413.588T23 16v5q0 .825-.587 1.413T21 23z"/>',
    '<path fill="currentColor" d="M5 4.85v14.3q-.425-.425-.8-.9t-.7-.975V6.725q.325-.5.7-.975t.8-.9m4-2.4v19.1q-.525-.175-1.025-.387T7 20.675V3.325q.475-.275.975-.488T9 2.45m7 18.725V2.825Q18.65 4 20.325 6.45T22 12t-1.675 5.55T16 21.175M12 22q-.25 0-.5-.012t-.5-.038V2.05q.25-.025.5-.037T12 2q.5 0 1 .05t1 .15v19.6q-.5.1-1 .15T12 22"/>',
    '<path fill="currentColor" d="M12 16.4L7.6 12L12 7.6l4.4 4.4zm0 6.375L1.225 12L12 1.225L22.775 12zm0-3.575l7.2-7.2L12 4.8L4.8 12z"/>',
    '<path fill="currentColor" d="m6 20l1-4H3l.5-2h4l1-4h-4L5 8h4l1-4h2l-1 4h4l1-4h2l-1 4h4l-.5 2h-4l-1 4h4l-.5 2h-4l-1 4h-2l1-4H9l-1 4zm3.5-6h4l1-4h-4z"/>',
    '<path fill="currentColor" d="M11.1 19h1.75v-1.25q1.25-.225 2.15-.975t.9-2.225q0-1.05-.6-1.925T12.9 11.1q-1.5-.5-2.075-.875T10.25 9.2t.463-1.025T12.05 7.8q.8 0 1.25.387t.65.963l1.6-.65q-.275-.875-1.012-1.525T12.9 6.25V5h-1.75v1.25q-1.25.275-1.95 1.1T8.5 9.2q0 1.175.688 1.9t2.162 1.25q1.575.575 2.188 1.025t.612 1.175q0 .825-.587 1.213t-1.413.387t-1.463-.512T9.75 14.1l-1.65.65q.35 1.2 1.088 1.938T11.1 17.7zm.9 3q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8"/>',
    '<path fill="currentColor" d="M9.138 20.175Q7.875 19.35 7.075 18l-1.525.875q-.35.2-.75.075t-.6-.475t-.1-.75t.45-.6l1.725-1q-.075-.275-.125-.563T6.05 15H4q-.425 0-.712-.288T3 14t.288-.712T4 13h2.05q.05-.3.1-.587t.125-.563l-1.725-1q-.35-.2-.45-.6t.1-.75t.613-.462t.762.087L7.05 10q.2-.35.463-.687T8.05 8.7Q8 8.525 8 8.35V8q0-.6.175-1.15t.475-1.025l-.95-.95q-.275-.275-.288-.7T7.7 3.45q.275-.3.688-.287t.712.287l1.05 1q.425-.225.888-.337T12 4t.975.125t.9.35L14.9 3.45q.3-.3.7-.288t.7.313q.275.3.288.7t-.288.7l-.95.95q.3.475.463 1.025T15.975 8v.338q0 .162-.05.337q.275.275.538.625t.462.7l1.525-.875q.35-.2.75-.088t.6.463t.088.763t-.463.612l-1.725.975q.075.275.138.563t.112.587H20q.425 0 .713.288T21 14t-.288.713T20 15h-2.05q-.05.3-.1.588t-.125.562l1.725 1q.35.2.45.613t-.1.762t-.6.45t-.75-.1L16.925 18q-.8 1.35-2.063 2.175T12 21t-2.863-.825M10.1 7.35q.425-.175.913-.262T12 7t.963.075t.887.25q-.2-.575-.7-.95T12 6t-1.175.388t-.725.962M12 19q1.825 0 2.913-1.525T16 14q0-1.75-1.012-3.375T12 9q-1.95 0-2.975 1.613T8 14q0 1.95 1.088 3.475T12 19m-.712-2.287Q11 16.425 11 16v-4q0-.425.288-.712T12 11t.713.288T13 12v4q0 .425-.288.713T12 17t-.712-.288"/>',
    '<path fill="currentColor" d="M7.713 15.713Q8 15.425 8 15t-.288-.712T7 14t-.712.288T6 15t.288.713T7 16t.713-.288M6 13h2V8H6zm4 2h8v-2h-8zm0-4h8V9h-8zm-8 9V4h20v16z"/>',
    '<path fill="currentColor" d="M4 17v2h16v-2zM2 6h4.2q-.125-.225-.162-.475T6 5q0-1.25.875-2.125T9 2q.75 0 1.388.388t1.112.962L12 4l.5-.65q.45-.6 1.1-.975T15 2q1.25 0 2.125.875T18 5q0 .275-.038.525T17.8 6H22v15H2zm2 8h16V8h-5.1l2.1 2.85L15.4 12L12 7.4L8.6 12L7 10.85L9.05 8H4zm5.713-8.287Q10 5.425 10 5t-.288-.712T9 4t-.712.288T8 5t.288.713T9 6t.713-.288M15 6q.425 0 .713-.288T16 5t-.288-.712T15 4t-.712.288T14 5t.288.713T15 6"/>',
    '<path fill="currentColor" d="M4.925 19.025q-1.4-1.425-2.162-3.25T2 11.95t.75-3.825t2.175-3.25L6.35 6.3Q5.2 7.425 4.6 8.888T4 11.95t.613 3.063T6.35 17.6zm3.513-1.462Q8 17.125 8 16.5t.438-1.062T9.5 15t1.063.438T11 16.5t-.437 1.063T9.5 18t-1.062-.437M12.974 13v-1.775l-1.525.9l-1-1.75l1.525-.875l-1.525-.875l1-1.75l1.525.9V6h2v1.775l1.525-.9l1 1.75l-1.525.875l1.525.875l-1 1.75l-1.525-.9V13zm6.1 6.025L17.65 17.6q1.15-1.125 1.75-2.588t.6-3.062t-.612-3.062T17.65 6.3l1.425-1.425q1.4 1.425 2.163 3.25T22 11.95t-.75 3.825t-2.175 3.25"/>',
    '<path fill="currentColor" d="M8 22v-1.75Q5.325 19.2 3.663 17T2 12h2V4l18-2v1.5L10.5 4.8v1.7H22V8H10.5v4H22q0 2.8-1.662 5T16 20.25V22zM8 6.5h1V4.95l-1 .125zm-2.5 0h1V5.25l-1 .1zM8 12h1V8H8zm-2.5 0h1V8h-1z"/>',
    '<path fill="currentColor" d="M3 21v-3h5q-2.1-1.125-3.3-3.125T3.5 10.5q0-3.55 2.475-6.025T12 2t6.025 2.475T20.5 10.5q0 2.375-1.2 4.375T16 18h5v3h-8v-5.1q1.95-.35 3.225-1.875T17.5 10.5q0-2.3-1.6-3.9T12 5T8.1 6.6t-1.6 3.9q0 2 1.275 3.525T11 15.9V21z"/>',
    '<path fill="currentColor" d="M6 14v2H2V2h14v4h-2V4H4v10zm2 8V8h14v14zm2-2h10V10H10zm5-5"/>',
    '<path fill="currentColor" d="M19 15q-1.275 0-2.137-.862T16 12t.863-2.137T19 9t2.138.863T22 12t-.862 2.138T19 15m-8.825-2H3q-.425 0-.712-.288T2 12t.288-.712T3 11h7.175L8.3 9.1q-.275-.275-.288-.687T8.3 7.7q.275-.275.7-.275t.7.275l3.6 3.6q.3.3.3.7t-.3.7l-3.6 3.6q-.3.3-.7.288t-.7-.313q-.275-.3-.288-.7t.288-.7z"/>',
    '<path fill="currentColor" d="M7 20V7H2V4h13v3h-5v13zm9 0v-8h-3V9h9v3h-3v8z"/>',
    '<path fill="currentColor" d="M6 20h12q.425 0 .713-.288T19 19H5q0 .425.288.713T6 20m4-12.837q-.8-.838-.75-2.038q.05-1.3.913-2.287T12 1q.975.85 1.838 1.838t.912 2.287q.05 1.2-.75 2.038T12 8t-2-.837M11 17h2v-6h-2zm1.538-11.225q.212-.225.212-.55q0-.425-.238-.775T12 3.775q-.275.325-.513.675t-.237.775q0 .325.213.55T12 6t.538-.225m8.25 11.013q.212-.213.212-.538t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212t.538-.213M18 22H6q-1.25 0-2.125-.875T3 19v-2h6V9h6v8h2.6q-.05-.2-.075-.375t-.025-.375q0-1.15.8-1.95t1.95-.8t1.95.8t.8 1.95q0 .95-.562 1.675T21 18.9v.1q0 1.25-.875 2.125T18 22m-7-5h2zm1-12.1"/>',
    '<path fill="currentColor" d="M1 23v-5h2v3h3v2zm17 0v-2h3v-3h2v5zm-6-4.5q-3 0-5.437-1.775T3 12q1.125-2.95 3.563-4.725T12 5.5t5.438 1.775T21 12q-1.125 2.95-3.562 4.725T12 18.5m0-2q2.2 0 4.025-1.2t2.8-3.3q-.975-2.1-2.8-3.3T12 7.5T7.975 8.7t-2.8 3.3q.975 2.1 2.8 3.3T12 16.5m0-1q1.45 0 2.475-1.025T15.5 12t-1.025-2.475T12 8.5T9.525 9.525T8.5 12t1.025 2.475T12 15.5m0-2q-.625 0-1.063-.437T10.5 12t.438-1.062T12 10.5t1.063.438T13.5 12t-.437 1.063T12 13.5M1 6V1h5v2H3v3zm20 0V3h-3V1h5v5zm-9 6"/>',
    '<path fill="currentColor" d="M3 20v-7.75q-.65-.175-1.075-.712T1.5 10.3V5h1v4h.75V5h1v4H5V5h1v5.3q0 .7-.425 1.238T4.5 12.25V20zM21.325 7.1q.8 1.025 1.238 2.263T23 12t-.45 2.638T21.3 16.9L16.4 12zM16 4.075q1.1.125 2.088.538T19.9 5.675L16 9.6zM15 20q-3.35 0-5.675-2.325T7 12q0-3.075 2.012-5.325T14 4.05v8.375l5.875 5.9q-1.025.8-2.262 1.238T15 20"/>',
    '<path fill="currentColor" d="M5.1 13.5q.2-.25.3-.612T5.5 12q0-.75-.5-1.9t-.5-1.725q0-.3.063-.625T4.9 7h1.5q-.275.425-.337.75T6 8.375q0 .575.5 1.725T7 12q0 .525-.1.863t-.3.637zm6.5 0q.2-.25.3-.612T12 12q0-.75-.5-1.9T11 8.375q0-.3.063-.625T11.4 7h1.5q-.275.425-.337.75t-.063.625q0 .575.5 1.725t.5 1.9q0 .525-.1.863t-.3.637zm-3.25 0q.2-.25.3-.612t.1-.888q0-.75-.5-1.9t-.5-1.725q0-.3.063-.625T8.15 7h1.5q-.275.425-.337.75t-.063.625q0 .575.5 1.725t.5 1.9q0 .525-.1.863t-.3.637zm1.4 8.5q-2.525 0-4.437-1.687T3 16.125q-.05-.45.25-.788T4 15h10.525l1.1-10.35q.125-1.125.963-1.888T18.6 2q1.25 0 2.125.875T21.6 5q0 .35-.062.925l-.063.575l-1.975-.25l.05-.513q.05-.512.05-.737q0-.425-.288-.712T18.6 4q-.4 0-.675.263T17.6 4.9l-1.15 10.875q-.275 2.65-2.175 4.438T9.75 22"/>',
    '<path fill="currentColor" d="M2 19v-2q.95 0 1.4-.5t1.925-.5q1.45 0 1.95.5t1.375.5q.95 0 1.413-.5T12 16t1.938.5t1.412.5q.875 0 1.375-.5t1.95-.5q1.475 0 1.925.5t1.4.5v2q-1.425 0-1.95-.5t-1.4-.5q-.9 0-1.4.5t-1.925.5q-1.475 0-1.925-.5T12 18t-1.4.5t-1.925.5q-1.425 0-1.925-.5t-1.4-.5q-.875 0-1.4.5T2 19m3.75-4q-.6 0-1.15-.225t-.975-.65L2.25 12.75l1.4-1.4l1.375 1.35q.15.15.337.225T5.75 13H7V9.625l-1.325.975L4.5 9L12 3.5L19.5 9l-1.175 1.625L17 9.65V13h1.25q.2 0 .388-.075t.337-.225l1.375-1.35l1.4 1.4l-1.375 1.375q-.425.425-.975.65T18.25 15zM11 13h2v-2h-2z"/>',
    '<path fill="currentColor" d="M8.463 18.538Q7 17.075 7 15q0-1.825 1.138-3.187T11 10.1V5.825l-.9.9Q9.825 7 9.413 7T8.7 6.7q-.275-.275-.275-.7t.275-.7l2.6-2.6q.15-.15.325-.213T12 2.426t.375.063t.325.212l2.6 2.6q.275.275.275.688T15.3 6.7q-.3.3-.712.3t-.713-.3L13 5.825V10.1q1.725.35 2.863 1.713T17 15q0 2.075-1.463 3.538T12 20t-3.537-1.463"/>'
  ];

  function makeSymbolIcon(id, extraClass) {
    var wrap = document.createElement('span');
    wrap.className = 'it-symbol-icon' + (extraClass ? ' ' + extraClass : '');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.innerHTML = SYMBOL_ICONS[id];
    wrap.appendChild(svg);
    return wrap;
  }

  var GLOBAL_TAG_FREQUENCY = {};
  WORDS.forEach(function (w) {
    w.tags.forEach(function (t) { GLOBAL_TAG_FREQUENCY[t] = (GLOBAL_TAG_FREQUENCY[t] || 0) + 1; });
  });

  var MENU_TAG_FREQUENCY = {};
  MENU.forEach(function (m) {
    m.tags.forEach(function (t) { MENU_TAG_FREQUENCY[t] = (MENU_TAG_FREQUENCY[t] || 0) + 1; });
  });

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  var symbolMap;
  var targets;
  var currentIdx;
  var solvedNames;
  var selectedWords;
  var elapsedSeconds;
  var timerId;
  var running;
  var roundPhase;
  var currentReveal;
  var seenSymbols;
  var asksSinceGuess;
  var hasGuessedOnce;

  function symbolFor(tag) { return symbolMap[tag]; }

  function bestGuessTags(words) {
    var counts = {};
    words.forEach(function (w) {
      w.tags.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    var keys = Object.keys(counts);
    var max = 0;
    keys.forEach(function (t) { if (counts[t] > max) max = counts[t]; });
    var topTags = keys.filter(function (t) { return counts[t] === max; });

    if (topTags.length === 1) return topTags;

    var minFreq = Math.min.apply(null, topTags.map(function (t) { return GLOBAL_TAG_FREQUENCY[t]; }));
    var rarest = topTags.filter(function (t) { return GLOBAL_TAG_FREQUENCY[t] === minFreq; });

    if (rarest.length === 1) return rarest;
    return shuffle(rarest).slice(0, 2);
  }

  function eliminationValue(tag, negated) {
    var freq = MENU_TAG_FREQUENCY[tag] || 0;
    return Math.max(1, negated ? freq : MENU.length - freq);
  }

  function weightedPick(pool, n) {
    pool.forEach(function (c) { c.key = Math.pow(Math.random(), 1 / c.weight); });
    pool.sort(function (a, b) { return b.key - a.key; });
    return pool.slice(0, n);
  }

  function rollReveal(target) {
    var candidates = target.tags.map(function (tag) {
      return { tag: tag, negated: false, weight: eliminationValue(tag, false) };
    });
    if (hasGuessedOnce) {
      TAGS.forEach(function (tag) {
        if (target.tags.indexOf(tag) === -1) {
          candidates.push({ tag: tag, negated: true, weight: eliminationValue(tag, true) });
        }
      });
    }

    var seen = candidates.filter(function (c) { return seenSymbols.indexOf(symbolFor(c.tag)) !== -1; });
    var unseen = candidates.filter(function (c) { return seenSymbols.indexOf(symbolFor(c.tag)) === -1; });
    var picked = weightedPick(seen, 3);
    if (picked.length < 3) picked = picked.concat(weightedPick(unseen, 3 - picked.length));

    return picked.map(function (c) { return { tag: c.tag, negated: c.negated }; });
  }

  function startGame() {
    symbolMap = {};
    var symbolIds = SYMBOL_ICONS.map(function (_, i) { return i; });
    shuffle(symbolIds).forEach(function (id, i) { symbolMap[TAGS[i]] = id; });

    targets = shuffle(MENU).slice(0, TARGET_COUNT);
    currentIdx = 0;
    solvedNames = [];

    selectedWords = [];
    elapsedSeconds = 0;
    running = true;
    roundPhase = 'ask';
    currentReveal = [];
    seenSymbols = [];
    asksSinceGuess = 0;
    hasGuessedOnce = false;

    logEl.innerHTML = '<p class="it-log-empty">Nothing yet — ask him something.</p>';
    answerSymbolsEl.innerHTML = '';
    overlayEl.hidden = true;
    orderFeedbackEl.textContent = '';
    orderFeedbackEl.className = 'it-order-feedback';
    renderSeenSymbols();

    renderWordGrid();
    renderCurrentOrder();
    renderHistory();
    renderMenuList();
    renderDecoder();
    renderProgress();
    updatePhaseUI();
    tickTimer(true);

    if (timerId) clearInterval(timerId);
    timerId = setInterval(function () { tickTimer(false); }, 1000);
  }

  function tickTimer(skipIncrement) {
    if (!skipIncrement) elapsedSeconds++;
    var m = Math.floor(elapsedSeconds / 60);
    var s = elapsedSeconds % 60;
    timerValueEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderWordGrid() {
    wordGridEl.innerHTML = '';
    WORDS.forEach(function (word, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'it-word';
      var name = document.createElement('span');
      name.className = 'it-word-name';
      name.textContent = word.name;
      var tags = document.createElement('span');
      tags.className = 'it-word-tags';
      tags.textContent = word.tags.join(' · ');
      btn.appendChild(name);
      btn.appendChild(tags);
      btn.addEventListener('click', function () { toggleWord(i); });
      wordGridEl.appendChild(btn);
    });
  }

  function toggleWord(i) {
    if (roundPhase !== 'ask') return;
    var pos = selectedWords.indexOf(i);
    if (pos !== -1) {
      selectedWords.splice(pos, 1);
    } else {
      if (selectedWords.length >= MAX_ASK_WORDS) return;
      selectedWords.push(i);
    }
    updatePhaseUI();
  }

  function updatePhaseUI() {
    var isAsk = roundPhase === 'ask';

    var wordButtons = wordGridEl.querySelectorAll('.it-word');
    wordButtons.forEach(function (btn, i) {
      var isSelected = selectedWords.indexOf(i) !== -1;
      btn.classList.toggle('is-selected', isSelected);
      btn.disabled = !isAsk || (!isSelected && selectedWords.length >= MAX_ASK_WORDS);
    });
    selectedCountEl.textContent = selectedWords.length + ' / ' + MAX_ASK_WORDS + ' selected';
    askBtn.disabled = !isAsk || selectedWords.length === 0 || !running;

    var menuCards = menuListEl.querySelectorAll('.it-menu-card');
    menuCards.forEach(function (card) { card.disabled = isAsk || !running; });

    if (!isAsk) {
      orderHintEl.textContent = 'That’s what he’s showing you this round — guess before he changes it.';
    } else if (asksSinceGuess === 0) {
      orderHintEl.textContent = 'Ask him something.';
    } else {
      orderHintEl.textContent = 'He needs to hear a bit more before he’ll let you guess — ask again.';
    }
    menuHintEl.textContent = isAsk ? 'Ask Indigo something first.' : 'Click something to guess it.';
  }

  function askIndigo() {
    if (!selectedWords.length || roundPhase !== 'ask') return;
    var words = selectedWords.map(function (i) { return WORDS[i]; });
    var tags = bestGuessTags(words);

    var emptyMsg = logEl.querySelector('.it-log-empty');
    if (emptyMsg) emptyMsg.remove();

    var entry = document.createElement('div');
    entry.className = 'it-log-entry';
    var wordsEl = document.createElement('span');
    wordsEl.className = 'it-log-words';
    wordsEl.textContent = words.map(function (w) { return w.name; }).join(', ');
    entry.appendChild(wordsEl);
    tags.forEach(function (tag) {
      var id = symbolFor(tag);
      entry.appendChild(makeSymbolIcon(id, 'it-log-symbol'));
      noteSeen(id);
    });
    logEl.appendChild(entry);
    renderAnswerSymbols(tags);

    selectedWords = [];

    var target = targets[currentIdx];
    currentReveal = rollReveal(target);
    currentReveal.forEach(function (item) { noteSeen(symbolFor(item.tag)); });

    asksSinceGuess++;
    roundPhase = asksSinceGuess >= ASKS_PER_GUESS ? 'guess' : 'ask';

    renderCurrentOrder();
    renderSeenSymbols();
    updatePhaseUI();
  }

  function noteSeen(symbol) {
    if (seenSymbols.indexOf(symbol) === -1) seenSymbols.push(symbol);
  }

  function renderSeenSymbols() {
    seenSymbolsEl.innerHTML = '';
    var label = document.createElement('span');
    label.textContent = 'Symbols seen so far:';
    seenSymbolsEl.appendChild(label);
    if (!seenSymbols.length) {
      var none = document.createElement('span');
      none.textContent = 'none yet';
      seenSymbolsEl.appendChild(none);
      return;
    }
    seenSymbols.forEach(function (id) {
      seenSymbolsEl.appendChild(makeSymbolIcon(id));
    });
  }

  function renderCurrentOrder() {
    orderSymbolsEl.innerHTML = '';
    currentReveal.forEach(function (item) {
      var cls = 'it-reveal-symbol' + (item.negated ? ' is-negated' : '');
      orderSymbolsEl.appendChild(makeSymbolIcon(symbolFor(item.tag), cls));
    });
  }

  function renderAnswerSymbols(tags) {
    answerSymbolsEl.innerHTML = '';
    tags.forEach(function (tag) {
      answerSymbolsEl.appendChild(makeSymbolIcon(symbolFor(tag), 'it-answer-symbol'));
    });
  }

  function renderHistory() {
    historyEl.innerHTML = '';
    solvedNames.forEach(function (name, i) {
      var item = document.createElement('span');
      item.className = 'it-history-item';
      item.innerHTML = (i + 1) + '. <strong>' + name + '</strong>';
      historyEl.appendChild(item);
    });
  }

  function renderMenuList() {
    menuListEl.innerHTML = '';
    shuffle(MENU).forEach(function (m) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'it-menu-card';
      var thumb = document.createElement('img');
      thumb.className = 'it-menu-card-thumb';
      thumb.src = '../images/menu/' + m.img;
      thumb.alt = '';
      thumb.loading = 'lazy';
      var text = document.createElement('span');
      text.className = 'it-menu-card-text';
      var title = document.createElement('span');
      title.className = 'it-menu-card-title';
      title.textContent = m.name;
      var desc = document.createElement('span');
      desc.className = 'it-menu-card-desc';
      desc.textContent = m.desc;
      text.appendChild(title);
      text.appendChild(desc);
      card.appendChild(thumb);
      card.appendChild(text);
      card.addEventListener('click', function () { submitGuess(m.name); });
      menuListEl.appendChild(card);
    });
  }

  function submitGuess(itemName) {
    if (!running || roundPhase !== 'guess') return;
    hasGuessedOnce = true;
    var target = targets[currentIdx];
    var correct = itemName === target.name;

    if (correct) {
      solvedNames.push(target.name);
      currentIdx++;
      orderFeedbackEl.textContent = 'That’s it.';
      orderFeedbackEl.className = 'it-order-feedback is-right';
      renderHistory();
      renderProgress();
      if (currentIdx >= TARGET_COUNT) { endGame(); return; }
    } else {
      orderFeedbackEl.textContent = 'Not quite — try again.';
      orderFeedbackEl.className = 'it-order-feedback is-wrong';
    }

    roundPhase = 'ask';
    currentReveal = [];
    asksSinceGuess = 0;
    renderCurrentOrder();
    updatePhaseUI();
  }

  function renderProgress() {
    progressEl.textContent = solvedNames.length + '/' + TARGET_COUNT;
  }

  function renderDecoder() {
    decoderGridEl.innerHTML = '';
    TAGS.forEach(function (tag) {
      var cell = document.createElement('div');
      cell.className = 'it-decoder-cell';

      var head = document.createElement('div');
      head.className = 'it-decoder-cell-head';
      var label = document.createElement('label');
      label.textContent = tag === 'Spice/Condiment' ? 'Spice/Cond' : tag;

      var markers = document.createElement('div');
      markers.className = 'it-decoder-markers';
      ['red', 'yellow', 'green'].forEach(function (color) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'it-decoder-marker';
        dot.dataset.color = color;
        dot.addEventListener('click', function () { dot.classList.toggle('is-on'); });
        markers.appendChild(dot);
      });
      head.appendChild(label);
      head.appendChild(markers);

      var pickBtn = document.createElement('button');
      pickBtn.type = 'button';
      pickBtn.className = 'it-decoder-pick';
      setDecoderPick(pickBtn, null);
      pickBtn.addEventListener('click', function () { openSymbolPicker(pickBtn, tag); });

      cell.appendChild(head);
      cell.appendChild(pickBtn);
      decoderGridEl.appendChild(cell);
    });
  }

  function setDecoderPick(btn, symbolId) {
    btn.innerHTML = '';
    btn.classList.toggle('has-pick', symbolId !== null);
    if (symbolId === null) {
      var dash = document.createElement('span');
      dash.className = 'it-decoder-pick-placeholder';
      dash.textContent = '—';
      btn.appendChild(dash);
    } else {
      btn.appendChild(makeSymbolIcon(symbolId));
    }
  }

  var symbolPickerTargetBtn = null;

  function openSymbolPicker(btn, tag) {
    symbolPickerTargetBtn = btn;
    symbolPickerTagEl.textContent = tag;
    symbolPickerGridEl.innerHTML = '';
    SYMBOL_ICONS.forEach(function (_, id) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'it-symbol-picker-option';
      opt.appendChild(makeSymbolIcon(id));
      opt.addEventListener('click', function () {
        setDecoderPick(btn, id);
        closeSymbolPicker();
      });
      symbolPickerGridEl.appendChild(opt);
    });
    symbolPickerEl.hidden = false;
  }

  function closeSymbolPicker() {
    symbolPickerEl.hidden = true;
    symbolPickerTargetBtn = null;
  }

  function endGame() {
    running = false;
    clearInterval(timerId);
    updatePhaseUI();
    var m = Math.floor(elapsedSeconds / 60);
    var s = elapsedSeconds % 60;
    overlayTitleEl.textContent = 'Order served.';
    overlayTextEl.textContent = 'You read him right, all three — took ' + m + ':' + (s < 10 ? '0' : '') + s + '.';
    overlayEl.hidden = false;
  }

  restartBtn.addEventListener('click', startGame);
  overlayRestartBtn.addEventListener('click', startGame);
  askBtn.addEventListener('click', askIndigo);

  symbolPickerClearBtn.addEventListener('click', function () {
    if (symbolPickerTargetBtn) setDecoderPick(symbolPickerTargetBtn, null);
    closeSymbolPicker();
  });
  symbolPickerCloseBtn.addEventListener('click', closeSymbolPicker);
  symbolPickerEl.addEventListener('click', function (e) {
    if (e.target === symbolPickerEl) closeSymbolPicker();
  });

  setupNotesFloat();
  startGame();

  function setupNotesFloat() {
    var panel = notesFloatEl;
    var header = notesFloatHeaderEl;
    var minBtn = notesFloatMinBtn;
    var fullBtn = document.getElementById('itNotesFloatFull');
    var opacityBtn = document.getElementById('itNotesFloatOpacity');
    if (!panel || !header || !minBtn) return;

    if (window.matchMedia('(max-width: 640px)').matches) {
      function toggleMinimized() {
        var isMin = panel.classList.toggle('is-minimized');
        minBtn.textContent = isMin ? '+' : '−';
        minBtn.setAttribute('aria-label', isMin ? 'Restore' : 'Minimize');
      }
      panel.classList.add('is-minimized');
      minBtn.textContent = '+';
      minBtn.setAttribute('aria-label', 'Restore');
      header.addEventListener('click', function (e) {
        if (e.target === minBtn || e.target === fullBtn) return;
        toggleMinimized();
      });
      minBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleMinimized();
      });
      return;
    }

    var dragging = false, moved = false;
    var startClientX, startClientY, startLeft, startTop;
    var preFullscreenTop = '', preFullscreenHeight = '';

    header.addEventListener('pointerdown', function (e) {
      if (e.target === minBtn || e.target === fullBtn || e.target === opacityBtn) return;
      dragging = true; moved = false;
      header.setPointerCapture(e.pointerId);
      var rect = panel.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      panel.style.left = startLeft + 'px';
      if (!panel.classList.contains('is-fullscreen')) panel.style.top = startTop + 'px';
      panel.style.right = 'auto';
      startClientX = e.clientX; startClientY = e.clientY;
      e.preventDefault();
    });

    header.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startClientX;
      var dy = e.clientY - startClientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      var maxLeft = window.innerWidth - panel.offsetWidth;
      var newLeft = Math.max(0, Math.min(maxLeft, startLeft + dx));
      panel.style.left = newLeft + 'px';
      if (!panel.classList.contains('is-fullscreen')) {
        var maxTop = window.innerHeight - panel.offsetHeight;
        var newTop = Math.max(0, Math.min(maxTop, startTop + dy));
        panel.style.top = newTop + 'px';
      }
      header.classList.add('is-dragging');
    });

    function endDrag() {
      dragging = false;
      header.classList.remove('is-dragging');
    }
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);

    minBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (moved) { moved = false; return; }
      if (panel.classList.contains('is-fullscreen')) exitFullscreen();
      var isMin = panel.classList.toggle('is-minimized');
      minBtn.textContent = isMin ? '+' : '−';
      minBtn.setAttribute('aria-label', isMin ? 'Restore' : 'Minimize');
    });

    function exitFullscreen() {
      panel.classList.remove('is-fullscreen');
      panel.style.top = preFullscreenTop;
      panel.style.height = preFullscreenHeight;
      fullBtn.classList.remove('is-active');
      fullBtn.setAttribute('aria-label', 'Fullscreen');
    }

    if (fullBtn) {
      fullBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isFull = panel.classList.contains('is-fullscreen');
        if (isFull) {
          exitFullscreen();
        } else {
          panel.classList.remove('is-minimized');
          minBtn.textContent = '−';
          minBtn.setAttribute('aria-label', 'Minimize');
          preFullscreenTop = panel.style.top;
          preFullscreenHeight = panel.style.height;
          panel.style.top = '0.5rem';
          panel.style.height = 'calc(100vh - 1rem)';
          panel.classList.add('is-fullscreen');
          fullBtn.classList.add('is-active');
          fullBtn.setAttribute('aria-label', 'Exit fullscreen');
        }
      });
    }

    if (opacityBtn) {
      var OPACITY_LEVELS = [1, 0.5, 0.3, 0.1];
      var opacityIdx = 0;
      opacityBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        opacityIdx = (opacityIdx + 1) % OPACITY_LEVELS.length;
        var level = OPACITY_LEVELS[opacityIdx];
        var pct = Math.round(level * 100);
        panel.style.opacity = level;
        opacityBtn.textContent = pct + '%';
        opacityBtn.setAttribute('aria-label', 'Panel opacity: ' + pct + '%');
      });
    }
  }
})();
