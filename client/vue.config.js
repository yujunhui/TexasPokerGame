module.exports = {
  devServer: {
    disableHostCheck: true,
  },
  chainWebpack: (config) => {
    if (process.env.NODE_ENV === 'production') {
      config.optimization.minimizer('terser').tap((args) => {
        Object.assign(args[0].terserOptions.compress, {
          warnings: false,
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log'],
        });
        return args;
      });
    }
  },
};
