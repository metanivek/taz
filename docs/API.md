## Modules

<dl>
<dt><a href="#module_classification">classification</a></dt>
<dd></dd>
<dt><a href="#module_collation">collation</a></dt>
<dd></dd>
<dt><a href="#module_collection">collection</a></dt>
<dd></dd>
<dt><a href="#module_constants">constants</a></dt>
<dd></dd>
<dt><a href="#module_gains">gains</a></dt>
<dd></dd>
<dt><a href="#module_income">income</a></dt>
<dd></dd>
<dt><a href="#module_utils">utils</a></dt>
<dd></dd>
</dl>

<a name="module_classification"></a>

## classification

* [classification](#module_classification)
    * [~classifyOperationGroup(address, group, tokens)](#module_classification..classifyOperationGroup)
    * [~classifyOperationGroups(address, ops, tokens)](#module_classification..classifyOperationGroups)

<a name="module_classification..classifyOperationGroup"></a>

### classification~classifyOperationGroup(address, group, tokens)
Classifies a single operation group from the perspective of a given address

**Kind**: inner method of [<code>classification</code>](#module_classification)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>String</code> | Address of perspective |
| group | <code>Array</code> | Item from [downloadAllOperationGroups](#module_collection..downloadAllOperationGroups) |
| tokens | <code>Array</code> | Tokens used for decimal interpretation |

<a name="module_classification..classifyOperationGroups"></a>

### classification~classifyOperationGroups(address, ops, tokens)
Classifies an array of operation groups from the perspective of a given address

**Kind**: inner method of [<code>classification</code>](#module_classification)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>String</code> | Address of perspective |
| ops | <code>Array</code> | Operation groups from [downloadAllOperationGroups](#module_collection..downloadAllOperationGroups) |
| tokens | <code>Array</code> | Tokens used for decimal interpretation |

<a name="module_collation"></a>

## collation
<a name="module_collation..collate"></a>

### collation~collate(exchangeRows, accountsRows) ⇒ <code>array</code>
Takes csv rows for exchange and account (blockchain) data
and collates, sorts, and classifies it.

**Kind**: inner method of [<code>collation</code>](#module_collation)  
**Returns**: <code>array</code> - collated, sorted, classified rows  

| Param | Type | Description |
| --- | --- | --- |
| exchangeRows | <code>Array.&lt;Array&gt;</code> | Array of Array of rows of centralized exchange transactions |
| accountsRows | <code>Array.&lt;Array&gt;</code> | Array of Array of rows of classifed operation groups |

<a name="module_collection"></a>

## collection

* [collection](#module_collection)
    * [~downloadAllHashesAndTokens(account, startDate, endDate)](#module_collection..downloadAllHashesAndTokens) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~downloadAllOperationGroups(hashes, currency)](#module_collection..downloadAllOperationGroups) ⇒ <code>Promise.&lt;Array&gt;</code>

<a name="module_collection..downloadAllHashesAndTokens"></a>

### collection~downloadAllHashesAndTokens(account, startDate, endDate) ⇒ <code>Promise.&lt;Object&gt;</code>
Downloads operation group hashes and token information for an account

**Kind**: inner method of [<code>collection</code>](#module_collection)  

| Param | Type | Description |
| --- | --- | --- |
| account | <code>String</code> | tz address |
| startDate | <code>String</code> | ISO 8601 timestamp |
| endDate | <code>String</code> | ISO 8601 timestamp |

<a name="module_collection..downloadAllOperationGroups"></a>

### collection~downloadAllOperationGroups(hashes, currency) ⇒ <code>Promise.&lt;Array&gt;</code>
Downloads operation groups

**Kind**: inner method of [<code>collection</code>](#module_collection)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - array of operation groups (arrays)  

| Param | Type | Description |
| --- | --- | --- |
| hashes | <code>Array</code> | list of operation group hashes to download |
| currency | <code>String</code> | TzKT compatible currency for fiat quotes |

<a name="module_constants"></a>

## constants
<a name="module_gains"></a>

## gains
<a name="module_gains..generateReport"></a>

### gains~generateReport(collatedRows) ⇒ <code>array</code>
Generates gains and losses report

**Kind**: inner method of [<code>gains</code>](#module_gains)  
**Returns**: <code>array</code> - rows of gains and losses  

| Param | Type | Description |
| --- | --- | --- |
| collatedRows | <code>Array</code> | Rows from [collate](#module_collation..collate) |

<a name="module_income"></a>

## income
<a name="module_income..summarize"></a>

### income~summarize(year, collatedRows, currency) ⇒ <code>Array.&lt;Object&gt;</code>
Generate summary of various incomes

**Kind**: inner method of [<code>income</code>](#module_income)  

| Param | Type | Description |
| --- | --- | --- |
| year | <code>Number</code> | - |
| collatedRows | <code>Array</code> | - |
| currency | <code>String</code> | - |

<a name="module_utils"></a>

## utils

* [utils](#module_utils)
    * [~chunksOf()](#module_utils..chunksOf)
    * [~dedupe()](#module_utils..dedupe)
    * [~move()](#module_utils..move)
    * [~isKT()](#module_utils..isKT)
    * [~isTz()](#module_utils..isTz)
    * [~strictAccessProxy(obj)](#module_utils..strictAccessProxy) ⇒ <code>Object</code>
    * [~range(start, end, by)](#module_utils..range)
    * [~calculateYearDateRanges(startYear, getCurrentYear)](#module_utils..calculateYearDateRanges) ⇒ <code>Object</code>
    * [~isTimestampInYear(timestamp, year)](#module_utils..isTimestampInYear) ⇒ <code>Boolean</code>

<a name="module_utils..chunksOf"></a>

### utils~chunksOf()
Create array of arrays of size

**Kind**: inner method of [<code>utils</code>](#module_utils)  
<a name="module_utils..dedupe"></a>

### utils~dedupe()
Remove duplicates from array, based on value of object property

**Kind**: inner method of [<code>utils</code>](#module_utils)  
<a name="module_utils..move"></a>

### utils~move()
In-place item move for array

**Kind**: inner method of [<code>utils</code>](#module_utils)  
<a name="module_utils..isKT"></a>

### utils~isKT()
Is an address a contract?

**Kind**: inner method of [<code>utils</code>](#module_utils)  
<a name="module_utils..isTz"></a>

### utils~isTz()
Is an address an account?

**Kind**: inner method of [<code>utils</code>](#module_utils)  
<a name="module_utils..strictAccessProxy"></a>

### utils~strictAccessProxy(obj) ⇒ <code>Object</code>
Create object that will throw an error when accessing missing properties

**Kind**: inner method of [<code>utils</code>](#module_utils)  

| Param | Type |
| --- | --- |
| obj | <code>Object</code> | 

<a name="module_utils..range"></a>

### utils~range(start, end, by)
Simple int range

**Kind**: inner method of [<code>utils</code>](#module_utils)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| start | <code>Number</code> |  |  |
| end | <code>Number</code> |  |  |
| by | <code>Number</code> | <code>1</code> | (optional, default 1) increment step |

<a name="module_utils..calculateYearDateRanges"></a>

### utils~calculateYearDateRanges(startYear, getCurrentYear) ⇒ <code>Object</code>
Calculate year date ranges from specified year to current year

**Kind**: inner method of [<code>utils</code>](#module_utils)  

| Param | Type | Description |
| --- | --- | --- |
| startYear | <code>Number</code> | first year |
| getCurrentYear | <code>function</code> | (optional) function to return override year |

<a name="module_utils..isTimestampInYear"></a>

### utils~isTimestampInYear(timestamp, year) ⇒ <code>Boolean</code>
Test if timestamp is in a given year

**Kind**: inner method of [<code>utils</code>](#module_utils)  

| Param | Type | Description |
| --- | --- | --- |
| timestamp | <code>String</code> | ISO 8601 timestamp |
| year | <code>Number</code> |  |

