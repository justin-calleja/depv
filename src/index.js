const { Future } = require('ramda-fantasy');
const readPkgUpAsPromised = require('read-pkg-up');
const readPkgAsPromised = require('read-pkg');
const { lift, map, traverse } = require('ramda');
const { resolve, join } = require('path');

// readPkgUpResultF :: Future Error Object
// The resolved Object is of the form: { pkg, path }
const readPkgUpResultF = Future((rej, res) => readPkgUpAsPromised().then(res).catch(rej))
const cachedReadPkgUpResultF = Future.cache(readPkgUpResultF);

// readPkg :: String -> Future Error Object
const readPkg = path => Future((rej, res) => readPkgAsPromised(path).then(res).catch(rej));

// pkgJSONF :: Future Error Object
const pkgJSONF = cachedReadPkgUpResultF.map(({ pkg }) => pkg);
// pathF :: Future Error String
const pathF = cachedReadPkgUpResultF.map(({ path }) => path);

// depSemverRangeDictF :: Fututre Error Object
const depSemverRangeDictF = pkgJSONF.map(pkgJSON => pkgJSON.dependencies);

// depNamesF :: Future Error [String]
const depNamesF = depSemverRangeDictF.map(Object.keys);

// joinPaths :: String -> [String] -> [String]
const joinPaths = (basePath, names) => names.map(name => join(basePath, name));
// mjoinPaths :: M String -> M [String] -> M [String]
const mjoinPaths = lift(joinPaths);

// depPathsF :: Future Error [String]
const depPathsF = mjoinPaths(
  pathF.map(path => resolve(path, '../node_modules')),
  depNamesF
);

// depsPkgJSONF :: [Future Error [Object]]
// The package.json of each dependency as an object
const depsPkgJSONF = depPathsF.chain(traverse(Future.of, readPkg));

const depVersionDictF = depsPkgJSONF.map(depsPkgJSON => {
  return depsPkgJSON.reduce((acc, val) => {
    acc[val.name] = val.version;
    return acc;
  }, {});
});

const depsColumnifyDataF = lift((depNames, depSemverRangeDict, depVersionDict) => {
  return depNames.map(name => {
    return {
      dependency: name,
      'semver-range': depSemverRangeDict[name],
      'installed-version': depVersionDict[name]
    }
  });
})(depNamesF, depSemverRangeDictF, depVersionDictF);

module.exports = {
  readPkgUpResultF,
  cachedReadPkgUpResultF,
  readPkg,
  pkgJSONF,
  pathF,
  depNamesF,
  joinPaths,
  depPathsF,
  depSemverRangeDictF,
  depVersionDictF,
  depsColumnifyDataF
};
