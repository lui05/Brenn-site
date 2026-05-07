module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/logo.png");
  return {
    dir: { input: "src", output: "_site" }
  };
};
