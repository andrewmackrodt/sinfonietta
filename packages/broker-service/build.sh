#!/bin/bash
set -euo pipefail

package_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
repo_dir=$(cd "$package_dir/../.." && pwd)
packages_dir="$repo_dir/packages"
dist_dir="$repo_dir/build/dist"

mkdir -p "$dist_dir"
find "$dist_dir" -mindepth 1 -maxdepth 1 -not -name public -exec rm -rf "{}" \;
cd "$package_dir"
tsc --sourcemap --outDir "$dist_dir"

cd "$dist_dir"

mv broker-service/* .
rmdir broker-service
cp -r "$package_dir/config" .
cp -r "$package_dir/views" .

mkdir -p packages/@lib

for d in $(sed -nE 's#^ +"@lib/([^"]+)":.+#\1#p' "$package_dir/package.json"); do
  mv "$d" packages/@lib
  mv "packages/@lib/$d/src/"* "packages/@lib/$d"
  rmdir "packages/@lib/$d/src"
  cp "$packages_dir/$d/package.json" "packages/@lib/$d"
  json -q -e 'delete this.main; delete this.scripts; delete this.devDependencies' -f "packages/@lib/$d/package.json" -I
done

cp "$package_dir/package.json" .
cp "$repo_dir/yarn.lock" .
json -q -e 'this.main = "index.js"; this.scripts = { "start":"node index" }; delete this.devDependencies' -f package.json -I
sed -E 's/"@lib\/([^"]+)": "\*"/"@lib\/\1": "link:.\/packages\/@lib\/\1"/' package.json > package.json.tmp && mv package.json.tmp package.json
