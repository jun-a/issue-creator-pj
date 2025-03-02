#!/bin/bash

# プロジェクト名
PROJECT_NAME="issue-draft-creator"

# ディレクトリの作成
mkdir -p $PROJECT_NAME/static/css
mkdir -p $PROJECT_NAME/templates

# 空のファイルの作成
touch $PROJECT_NAME/main.py
touch $PROJECT_NAME/requirements.txt
touch $PROJECT_NAME/static/css/styles.css
touch $PROJECT_NAME/static/htmx.min.js
touch $PROJECT_NAME/templates/base.html
touch $PROJECT_NAME/templates/index.html
touch $PROJECT_NAME/README.md

# 完了メッセージ
echo "Project '$PROJECT_NAME' structure created."