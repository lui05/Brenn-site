module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/logo.png");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/sitemap.xml");
  return {
    dir: { input: "src", output: "_site" }
  };
};
