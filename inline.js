new (require('inliner'))(
    'src/index.html',
    {
        images: true,
        compressCSS: true,
        compressJS: false,
        collapseWhitespace: true,
        nosvg: false,
        skipAbsoluteUrls: false
    },

    function(error, html) {
        console.log(html);
    }
);
