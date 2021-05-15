module.exports = {
    debug: !(require('./main').RELEASE),
    initImmediate: false,

    lng: 'en',
    fallbackLng: 'en',

    resources: {
        en: {
            translation: {
                "APP_LICENSE": "<h3>The MIT License (MIT)</h3>\
<p>Copyright (c) 2021 Kirill Konstantinov</p>\
<p>Данная лицензия разрешает лицам, получившим копию данного программного обеспечения и сопутствующей документации (в дальнейшем именуемыми «Программное Обеспечение»), безвозмездно использовать Программное Обеспечение без ограничений, включая неограниченное право на использование, копирование, изменение, слияние, публикацию, распространение, сублицензирование и/или продажу копий Программного Обеспечения, а также лицам, которым предоставляется данное Программное Обеспечение, при соблюдении следующих условий:</p>\
<p>Указанное выше уведомление об авторском праве и данные условия должны быть включены во все копии или значимые части данного Программного Обеспечения.</p>\
<p>ДАННОЕ ПРОГРАММНОЕ ОБЕСПЕЧЕНИЕ ПРЕДОСТАВЛЯЕТСЯ «КАК ЕСТЬ», БЕЗ КАКИХ-ЛИБО ГАРАНТИЙ, ЯВНО ВЫРАЖЕННЫХ ИЛИ ПОДРАЗУМЕВАЕМЫХ, ВКЛЮЧАЯ ГАРАНТИИ ТОВАРНОЙ ПРИГОДНОСТИ, СООТВЕТСТВИЯ ПО ЕГО КОНКРЕТНОМУ НАЗНАЧЕНИЮ И ОТСУТСТВИЯ НАРУШЕНИЙ, НО НЕ ОГРАНИЧИВАЯСЬ ИМИ. НИ В КАКОМ СЛУЧАЕ АВТОРЫ ИЛИ ПРАВООБЛАДАТЕЛИ НЕ НЕСУТ ОТВЕТСТВЕННОСТИ ПО КАКИМ-ЛИБО ИСКАМ, ЗА УЩЕРБ ИЛИ ПО ИНЫМ ТРЕБОВАНИЯМ, В ТОМ ЧИСЛЕ, ПРИ ДЕЙСТВИИ КОНТРАКТА, ДЕЛИКТЕ ИЛИ ИНОЙ СИТУАЦИИ, ВОЗНИКШИМ ИЗ-ЗА ИСПОЛЬЗОВАНИЯ ПРОГРАММНОГО ОБЕСПЕЧЕНИЯ ИЛИ ИНЫХ ДЕЙСТВИЙ С ПРОГРАММНЫМ ОБЕСПЕЧЕНИЕМ.</p>\
",
                "APP_INFO": "<h3>waves.html</h3><p>Version: " + require('./main').VERSION + "</p><p>Author: Konstantinov Kirill</p><h4>Controls:</h4> <p>" +
                "Left click - drag the grid or a point (hold)<br>\
                Double left click - create/delete a point<br>\
                <br>\
                Mouse wheel - zoom X axis<br>\
                Mouse wheel + Shift (hold) - zoom Y axis (if provided)<br>\
                <br>\
                Table in \"Data\" section is editable." +
                "</p>",

                "DISPERSION_REFERENCE": "<p><i>spike(x)</i> - Single spike at x = 0</p>" +
                "<p><i>box(x)</i> - Unity where |x| <= 1</p>" +
                "<p><i>triangle(x)</i> - Isosceles triangle with h = 1 where |x| <= 1</p>"
            }
        },

        ru: {
            translation: {
                "Presets": "Демонстрации",
                "Options": "Опции",
                "Data": "Данные",
                "About": "О программе",
                "Annotation": "Аннотация",
                "License": "Лицензионное соглашение",
                "Third-party": "Третьи лица",
                "The following third-party software was used:": "Используются следующие программные компоненты и библиотеки:",

                "Add new preset": "Добавить новую демонстрацию",
                "Add a preset from current configuration": "Сохранить текущее состояние",
                "Import from a file": "Импортировать из файла",
                "Export to a file": "Экспортировать в файл",
                "Export as text": "Экспортировать как текст",

                "Name:": "Название:",
                "Type here": "Введите здесь",
                "Default": "По умолчанию",

                "Time axis:": "Ось времени:",
                "Factor:": "Коэффициент:",
                "Interval:": "Интервал:",

                "Discrete summation": "Дискретное суммирование",
                "Show monochromatic components": "Показывать монохроматические составляющие",
                "Show plane at x = 1": "Показывать секущую плоскость (x = 1)",
                "Show extrema": "Показывать экстремумы",
                "Show envelope": "Показывать огибающую",
                "Show wave packet": "Выделить волновой пакет",
                "Show rendezvous of components": "Показывать образование вершины гребня и его перемещение",
                "Show vector arrows": "Показывать стрелки у векторов",
                "Show the value of velocities": "Показывать численные значения скоростей",
                "Snap markers to grid": "Только целочисленные значения параметров составляющих",

                "(Unimplemented): ": "(Не реализовано): ",
                "Analysis of different amplitudes or initial phases is not implemented yet": "Анализ составляющих с разными амплитудами или начальными фазами не предусмотрен",
                "Group velocity is not defined": "Групповая скорость не была определена",
                "There are components with equal velocities! (unimplemented)": "Присутствуют составляющие с одинаковыми фазовыми скоростями! (Не предусмотрено)",
                "Simplification failed": "Ошибка при упрощении выражения",
                "No integer solutions for waves": "Нет целочисленных решений для составляющих",
                "and": "и",
                "Wrong particular solution": "Неверное частное решение",
                "There is a wave where k is zero!": "Волновое число не может быть нулем!",
                "(General solution)": "(Общее решение)",
                "(Particular solution)": "(Частное решение)",


                "Components": "Составляющие",
                "Analysis": "Анализ",
                "Values": "Величины",

                "Beat": "Биения",

                "Dispersion": "Дисперсия",
                "Functions": "Функции",
                "Impulse": "Импульс",
                "Dispersion relation": "Закон дисперсии",

                "Simulation": "Параметры моделирования",
                "Period": "Период",
                "# of points": "Число точек",

                "Show velocity graph": "Показывать график скорости",
                "Invert frequency": "Инвертировать пространственную частоту",
                "Show impulse interpolation": "Показывать интерполяцию импульса",
                "Show point lines": "Показывать вертикальные линии к точкам",

                "Functions reference": "Специальные функции",
                "DISPERSION_REFERENCE": "<p><i>spike(x)</i> - Единичный импульс при x = 0</p>" +
                "<p><i>box(x)</i> - Единица при |x| <= 1</p>" +
                "<p><i>triangle(x)</i> - Равнобедренный треугольник с h = 1 при |x| <= 1</p>"
            },
        },
    },

    // gettext way, see http://i18next.com/translate/keyBasedFallback/
    nsSeparator: false,
    keySeparator: false
};
