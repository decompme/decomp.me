#!/bin/bash
set -euo pipefail

compiler_dir="$(dirname $(readlink -f "${BASH_SOURCE[0]}"))"
compiler_url="https://cdn.discordapp.com/attachments/698589325620936736/845499146982129684/mwccarm.zip"
mwcc_exe="mwccarm.exe"

echo "compiler_dir is ${compiler_dir}"

declare -A COMPILERS_12
COMPILERS_12["base"]="mwcc_20_72"
COMPILERS_12["sp2"]="mwcc_20_79"
COMPILERS_12["sp2p3"]="mwcc_20_82"
COMPILERS_12["sp3"]="mwcc_20_84"
COMPILERS_12["sp4"]="mwcc_20_87"

declare -A COMPILERS_20
COMPILERS_20["base"]="mwcc_30_114"
COMPILERS_20["sp1"]="mwcc_30_123"
COMPILERS_20["sp1p2"]="mwcc_30_126"
COMPILERS_20["sp1p5"]="mwcc_30_131"
COMPILERS_20["sp1p6"]="mwcc_30_133"
COMPILERS_20["sp1p7"]="mwcc_30_134"
COMPILERS_20["sp2"]="mwcc_30_136"
COMPILERS_20["sp2p2"]="mwcc_30_137"
COMPILERS_20["sp2p3"]="mwcc_30_138"
COMPILERS_20["sp2p4"]="mwcc_30_139"

declare -A COMPILERS_DSI
COMPILERS_DSI["1.1"]="mwcc_40_1018"
COMPILERS_DSI["1.1p1"]="mwcc_40_1024"
COMPILERS_DSI["1.2"]="mwcc_40_1026"
COMPILERS_DSI["1.2p1"]="mwcc_40_1027"
COMPILERS_DSI["1.2p2"]="mwcc_40_1028"
COMPILERS_DSI["1.3"]="mwcc_40_1034"
COMPILERS_DSI["1.3p1"]="mwcc_40_1036"
COMPILERS_DSI["1.6sp1"]="mwcc_40_1051"

echo "Downloading MWCC compilers"
wget -q -O "${compiler_dir}/compilers.zip" "${compiler_url}"

echo "Extracting compilers"
unzip -oq "${compiler_dir}/compilers.zip" -d "${compiler_dir}" && rm "${compiler_dir}/compilers.zip"

for key in "${!COMPILERS_12[@]}"; do
    compiler_id="${COMPILERS_12[${key}]}"
    compiler_version="${key}"
    if [ -f "${compiler_dir}/mwccarm/1.2/${compiler_version}/${mwcc_exe}" ]; then
        echo "Moving ${compiler_dir}/mwccarm/1.2/${compiler_version}/* to ${compiler_id}/"
        mkdir -p "${compiler_dir}/${compiler_id}"
        mv "${compiler_dir}/mwccarm/1.2/${compiler_version}/"* "${compiler_dir}/${compiler_id}/"
        cp "${compiler_dir}/mwccarm/license.dat" "${compiler_dir}/${compiler_id}/"
    fi
done

for key in "${!COMPILERS_20[@]}"; do
    compiler_id="${COMPILERS_20[${key}]}"
    compiler_version="${key}"
    if [ -f "${compiler_dir}/mwccarm/2.0/${compiler_version}/${mwcc_exe}" ]; then
        echo "Moving ${compiler_dir}/mwccarm/2.0/${compiler_version}/* to ${compiler_id}/"
        mkdir -p "${compiler_dir}/${compiler_id}"
        mv "${compiler_dir}/mwccarm/2.0/${compiler_version}/"* "${compiler_dir}/${compiler_id}/"
        cp "${compiler_dir}/mwccarm/license.dat" "${compiler_dir}/${compiler_id}/"
    fi
done

for key in "${!COMPILERS_DSI[@]}"; do
    compiler_id="${COMPILERS_DSI[${key}]}"
    compiler_version="${key}"
    if [ -f "${compiler_dir}/mwccarm/dsi/${compiler_version}/${mwcc_exe}" ]; then
        echo "Moving ${compiler_dir}/mwccarm/dsi/${compiler_version}/* to ${compiler_id}/"
        mkdir -p "${compiler_dir}/${compiler_id}"
        mv "${compiler_dir}/mwccarm/dsi/${compiler_version}/"* "${compiler_dir}/${compiler_id}/"
        cp "${compiler_dir}/mwccarm/license.dat" "${compiler_dir}/${compiler_id}/"
    fi
done

# set executable bit to allow WSL without wine
find . -name "${mwcc_exe}" | xargs chmod +x
