module.exports = {
  packagerConfig: {
    asar: true,
    icon: './public/src/assets/icons/windows-4',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'win98_web_edition',
      },
    },
  ],
};
