# Kafka，OpenWhisk 和 IBM Watson 集成用例。

这个项目主要用来展示如何利用 OpenWhisk平台来集成Kafka和IBM watson。主要目的是展示无服务器计算平台OpenWhisk的灵活性和强大之处。
原始代码来自[openwhisk-data-processing-message-hub](https://github.com/IBM/openwhisk-data-processing-message-hub.git)
并做了少许改动以集成IBM Watson API。仅作为教学和展示用途，其它用途请参考协议。


## 包括的组件

Openwhisk
Message Hub(kafka)
IBM watson


## 前提条件

你应该了解基本的OpenWhisk编程模型，请参考：[try the action, trigger, and rule demo first](https://github.com/IBM/openwhisk-action-trigger-rule)。

你应该有IBM Bluemix账户和最新版的[OpenWhisk command line tool (`wsk`) 安装到PATH下。](https://github.com/IBM/openwhisk-action-trigger-rule/blob/master/docs/OPENWHISK.md).


## 步骤

1. 准备Watson 翻译API 实例
2. 准备消息中心
3. 创建OpenWhisk actions, triggers, 和rules
4. 测试新的消息
5. 删除actions, triggers, 和rules
6. 手动重新部署

# 1. 准备Watson 翻译API实例
登录到Bluemix中，选择服务,然后选择Watson，选择创建Language Translator服务。服务创建完成后，可以看到相关的API的用户名
和密码。

# 2. 准备消息中心
登录到Bluemix中，创建一个Message Hub实例， 命名为kafka-broker，在控制面板中，创建两个主题：in-topic和out-topic。
拷贝template.local.env到新文件，并命名为local.env，更新相关字段的值，包括API_KEY, USER, PASSWORD，WATSON_TRANSLATIONAPI_USERNAME，
WATSON_TRANSLATIONAPI_PASSWORD，其中API_KEY, USER, PASSWORD 为kafka服务实例的相关字段，WATSON_TRANSLATIONAPI_USERNAME
和WATSON_TRANSLATIONAPI_PASSWORD为在上一步中创建的Watson服务的相关字段。

# 3. 创建OpenWhisk actions, triggers, 和rules
deploy.sh是一个方便的脚本，从local.env中读取环境变量，然后创建相关的实体到OpenWhisk平台上，包括actions, triggers, 和rules。
请执行以下命令。
```bash
./deploy.sh --install
```

# 4. 测试新消息
打开一个终端窗口，执行以下命令
```bash
wsk activation poll
```
有两个脚本帮助模拟消息生产者和消息消费者， 请执行以下命令
```bash
# Produce a message, will trigger the sequence
./kafka_publish.sh

# Consume a message after processing is complete
./kafka_consume.sh
```

# 5. 删除actions, triggers, 和rules
用deploy.sh脚本来删除已经部署的环境，请执行以下命令。
```bash
./deploy.sh --uninstall
```

# 6. 手动重新部署
本节提供手动部署相关环境的命令，以帮助更进一步了解actions, triggers, rule和package的细节。

## 6.1 绑定kafka和watson包的凭证参数

```bash
wsk package refresh
wsk package create kafka
wsk package bind kafka kafka-out-binding \
  --param api_key ${API_KEY} \
  --param kafka_rest_url ${KAFKA_REST_URL} \
  --param topic ${DEST_TOPIC} \
  --param username ${WATSON_TRANSLATIONAPI_USERNAME} \
  --param password ${WATSON_TRANSLATIONAPI_PASSWORD}
wsk package get --summary kafka-out-binding
```

## 6.2 创建kafka消息trigger
用以下命令创建kafka的trigger，来监听新的消息。
```bash
wsk trigger create kafka-trigger \
  --feed /_/Bluemix_${KAFKA_INSTANCE_NAME}_Credentials-1/messageHubFeed \
  --param isJSONData true \
  --param topic ${SRC_TOPIC}
```

## 6.3 创建消费消息的action
上传mhget-action, 当消息通过trigger发送来的时候，用来下载消息。请执行以下命令。

```bash
wsk action create mhget-action actions/mhget/mhget.js
```

## 6.4 创建翻译和发回消息的action
上传mhpost-action 为一个压缩包action， 以包括相关的不在默认Node.js环境中的包，这个action翻译消息，然后
将翻译玩的消息发回消息队列。请执行以下命令。
```bash
DIR=`pwd`
cd actions/mhpost
npm install --loglevel=error
zip -r mhpost.zip *
cd ${DIR}
wsk action create kafka/mhpost-action actions/mhpost/mhpost.zip --kind nodejs:6
```

## 6.5 创建连接get和post action的序列
以下命令创建连接mhget-action和mhpost-action的序列，并命名为kafka-sequence
```bash
wsk action create kafka-sequence --sequence mhget-action,kafka-out-binding/mhpost-action
```

## 6.6 测试新消息
执行以下命令来测试消息
```bash
# Produce a message, will trigger the sequence
./kafka_publish.sh

# Consume a message after processing is complete
./kafka_consume.sh
```


# 排错
通过执行命令 `wsk activation poll` 来监控执行情况。
保证你的 [wsk cli](https://console.ng.bluemix.net/openwhisk/learn/cli)版本是最新的
执行以下命令确认版本

```bash
wsk property get --cliversion
```

# 协议
[Apache 2.0](LICENSE.txt)