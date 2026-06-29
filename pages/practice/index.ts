Page<{}, {
  startAllLocal: () => void;
  startAllCloud: () => void;
  openLocalCategories: () => void;
  openCloudCategories: () => void;
  openLocalGroups: () => void;
  openCloudGroups: () => void;
}>({
  startAllLocal() {
    wx.navigateTo({ url: '/pages/practice/player?mode=local&sourceType=all' });
  },

  startAllCloud() {
    wx.navigateTo({ url: '/pages/practice/player?mode=cloud&sourceType=all' });
  },

  openLocalCategories() {
    wx.navigateTo({ url: '/pages/practice/categories?mode=local' });
  },

  openCloudCategories() {
    wx.navigateTo({ url: '/pages/practice/categories?mode=cloud' });
  },

  openLocalGroups() {
    wx.navigateTo({ url: '/pages/practice/groups?mode=local' });
  },

  openCloudGroups() {
    wx.navigateTo({ url: '/pages/practice/groups?mode=cloud' });
  }
});
