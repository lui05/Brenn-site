module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/logo.png": "logo.png" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/sitemap.xml": "sitemap.xml" });
  return {
    dir: { input: "src", output: "_site" }
  };
};
