/* eslint-env node */
module.exports = {
  plugins: [
    require("autoprefixer"),
    require("cssnano")({
      preset: [
        "default",
        {
          mergeRules: true,
          discardComments: {
            removeAll: true,
          },
        },
      ],
    }),
  ],
};
