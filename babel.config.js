module.exports = function (api) {
  const isTest = api.env('test');
  const presets = isTest ? [
    [
      "@babel/preset-env",
      {
        "targets": {"node":"current"}
      }
    ]
  ] : [
    [
      "@babel/preset-env",
      {
        "modules": "commonjs"
      }
    ]
  ];
  const plugins = [];

  return {
    presets,
    plugins
  };
}
