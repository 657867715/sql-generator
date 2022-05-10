/**
 * 生成 SQL
 * @param json
 */
export function doGenerateSQL(json: InputJSON): string {
    if (!json?.main) {
        return "";
    }
    const context = json;
    const result = replaceParams(context.main, context);
    return replaceSubSql(result, context);
}

/**
 * 参数替换（params）
 * @param currentNode
 * @param context
 * @param params 动态参数
 */
function replaceParams(currentNode: InputJSONValue, context: InputJSON, params?: Record<string, string>): string {
    if (currentNode == null) {
        return "";
    }
    const sql = currentNode.sql ?? currentNode;
    if (!sql) {
        return "";
    }
    // 动态、静态参数结合，且优先用静态参数
    params = {...(params ?? {}), ...currentNode.params};
    // 无需替换
    if (!params || Object.keys(params).length < 1) {
        return sql;
    }
    let result = sql;
    for (const paramsKey in params) {
        const replacedKey = `#{${paramsKey}}`;
        // 递归解析
        const replacement = replaceSubSql(params[paramsKey], context);
        // find and replace
        result = result.replaceAll(replacedKey, replacement);
    }
    return result;
}

/**
 * 替换子 SQL（@xxx）
 * @param sql
 * @param context
 */
function replaceSubSql(sql: string, context: InputJSON): string {
    if (!sql) {
        return "";
    }
    const regExp = /@([\u4e00-\u9fa5_a-zA-Z0-9]+)\((.*?)\)/;
    let result = sql;
    result = String(result);
    let regExpMatchArray = result.match(regExp);
    // 依次替换
    while (regExpMatchArray && regExpMatchArray.length > 2) {
        // 找到结果
        const subKey = regExpMatchArray[1];
        // 可用来替换的节点
        const replacementNode = context[subKey];
        // 没有可替换的节点
        if (!replacementNode) {
            throw new Error(`${subKey} 不存在`);
        }
        // 获取要传递的动态参数
        // e.g. "a = b, c = d"
        let paramsStr = regExpMatchArray[2];
        if (paramsStr) {
            paramsStr = paramsStr.trim();
        }
        // e.g. ["a = b", "c = d"]
        const singleParamsStrArray = paramsStr.split(',');
        // string => object
        const params: Record<string, string> = {};
        for (const singleParamsStr of singleParamsStrArray) {
            const keyValueArray = singleParamsStr.split('=');
            if (keyValueArray.length < 2) {
                continue;
            }
            const key = keyValueArray[0].trim();
            params[key] = keyValueArray[1].trim();
        }
        const replacement = replaceParams(replacementNode, context, params);
        result = result.replaceAll(regExpMatchArray[0], replacement);
        regExpMatchArray = result.match(regExp);
    }
    return result;
}