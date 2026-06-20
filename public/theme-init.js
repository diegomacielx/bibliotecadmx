(function () {
  try {
    var t = localStorage.getItem('dmx_theme');
    var theme = t === 'light' || t === 'dark' ? t : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
})();
