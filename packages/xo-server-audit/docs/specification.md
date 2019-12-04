This is a specification document which stipulate how the Audit log plugin should work and how the audit view should be.

### Function

Audit log plugin is a tool which provides a visibility of the `XO` user activity.

### User actions view

A system admin should have the ability to view user actions done on its infrastructure.
Each action should contains its name, its parameters, its result, its date and the user ID/mail.

| user          | start                   | duration | action  | parameters                                   | result  |
| ------------- | ----------------------- | -------- | ------- | -------------------------------------------- | ------- |
| toto@mail.com | Jan 2, 2019, 3:59:10 PM | 2 min    | vm.stop | - id: "7c03e9e1-0f92-424e-d677-0174b7b0229a" | success |

He should also have the ability to filter actions by user, action, status and `XO` entity.

### Actions history

> Sensitive data should be obfuscated

Some actions need to be conserved to keep a history of the user activity. These actions
should give a valuable information about his activity.

Conserved actions:

- **API calls**: we consider that all `xo-server` API calls gives a valuable information except the calls described in the [`Block list`](#blockList)

- **user sign in / sign out**

- **open / close of a VM / host console**

### <span id='blockList'>Block list</span>

#### Functional requirement

A block list should be a configuration which contains a [micromatch pattern](https://github.com/micromatch/micromatch) for skipped API calls.

#### Technical requirement

The block list should be based on [`TOML`](https://github.com/toml-lang/toml/blob/master/README.md) and should be loaded using [`app-conf`](https://www.npmjs.com/package/app-conf).

#### Methods to skip

- system.*
- session.*
- *.get*?
- *.list*?
- *.fetch*?
- *.scan*?
- *.create*?
- *.stats
- *.test*

### User actions

User actions can be handled by listening to two emitted events on `XO`:

- `xo:preCall`: is an event which is emitted before the call of the action

```
providedData {
  callId: String,
  method: String,
  params: Object,
  timestamp: Number,
  userId: String,
  userName: String,
}
```

- `xo:postCall`: is an event which is emitted after the call of the action

```
providedData {
  callId: String,
  duration: Number,
  error?: object,
  method: String,
  params: Object,
  result?: Any,
  timestamp: Number,
  timestamp: Number,
  userId: String,
  userName: String,
}
```

### Logs integrity

#### Structure

Stored logs can be falsified by any user who has access to the data base.

To preserve the logs integrity, each log entry should be identified by its hash and should contains its parent hash.

```
HASH0: hight level parent hash

[ undefined | HASH0 ] <- [ HASH0 | HASH1 ] <- [ HASH1 | HASH2 ] <- [ HASH2 | HASH3 ]
____________________________________________________________________________________
[Hash] {
  callId: String,
  duration?: Number,
  end?: Number,
  error?: object,
  method: String,
  params: Object,
  preHash: Hash,
  result?: Any,
  start: Number,
  userId: String,
  userName: String,
}
```

#### Check

The logs integrity can be checked by passing a start hash.

##### Algorithm

```
Checking the logs integrity starting from HASH2

[ undefined | HASH0 ] <- [ HASH0 | HASH1 ] <- [ HASH1 | HASH2 ] <- [ HASH2 | HASH3 ]

Check steps:

1. HASH2 exists ? next : throw an error
2. HASH2 correspond to its entry ? next : throw an error
3. HASH1 exists ? next : throw an error
4. HASH1 correspond to its entry ? next : throw an error
5. HASH0 exists ? next : throw an error
6. HASH0 correspond to its entry ? next : throw an error
7. integrity validated
```

See the continuation of this algorithm in the [garbage collector](#gc) section.

The plugin should provide two ways to check the logs integrity:

- **manual**: expose a API method
- **automatic**: communicate with **www-xo** to store `n` latest hashes and automatically check the integrity of the logs for each `n` seconds.

The plugin should expose a method for updating log hashes, it can be util if the check of the logs integrity fails.

### <span id='gc'>Garbage collector (GC)</span>

Audit log generate a lot of logs which can leads to a disk saturation. To avoid this issue, a GC will be implemented which will clear old logs.

The GC has two modes:
- **manual**: exposing a API method
- **automatic**: configuring `n` elements to keep

#### Problematic

The GC will conflicts with the check of the logs integrity.

##### Scenario

```
checking the logs integrity starting from HASH2 after a pass of the GC

deleted <- [ HASH1 | HASH2 ] <- [ HASH2 | HASH3 ]
1. HASH2 exists -> next
2. HASH2 correspond to its entry -> next
3. HASH1 doesn't exist -> throw an error
```

#### <span id='firstSolution'>First solution</span>

Validate the logs integrity even if a parent doesn't exists. The check of the integrity algorithm will be:

##### Algorithm
```
Checking the logs integrity starting from HASH2

[ undefined | HASH0 ] <- [ HASH0 | HASH1 ] <- [ HASH1 | HASH2 ] <- [ HASH2 | HASH3 ]

Check steps:

1. HASH2 exists ? next : throw an error
2. HASH2 correspond to its entry ? next : throw an error
3. HASH1 exists ? next : integrity validated
4. HASH1 correspond to its entry ? next : throw an error
5. HASH0 exists ? next :  integrity validated
6. HASH0 correspond to its entry ? next : throw an error
7. integrity validated
```
##### Limitation

- the integrity will be validated even if a malicious user deletes the old logs
- the integrity check will be falsy if a used pass a hash deleted by GC

#### <span id='secondSolution'>Second solution</span>

Update hashes after a GC pass.

##### Scenario

```
1. New hash wait for the update of the old hashes before its storing

deleted <- [ HASH1 | HASH2 ] <- [ HASH2 | HASH3 ] (waiting fo the update of the hashes [ ?| HASH4])

2. New hashes stored

[ undefined | HASH*2 ] <- [ HASH*2 | HASH*3 ] <- [ HASH*3 | HASH4 ]
```

##### Limitation

- use more resources due to the update of all old hashes
- block the store of the new hashes

#### Third solution

Using the [first solution](#firstSolution) with storing the latest hash removed by GC.

##### Algorithm

```
Checking the logs integrity starting from HASH2

[ undefined | HASH0 ] <- [ HASH0 | HASH1 ] <- [ HASH1 | HASH2 ] <- [ HASH2 | HASH3 ]

Check steps:

1. HASH2 exists ? next : deleted by GC ? integrity validated : throw an error
2. HASH2 correspond to its entry ? next : throw an error
3. HASH1 exists ? next : deleted by GC ? integrity validated : throw an error
4. HASH1 correspond to its entry ? next : throw an error
5. HASH0 exists ? next :  deleted by GC ? integrity validated : throw an error
6. HASH0 correspond to its entry ? next : throw an error
7. integrity validated
```

##### Limitation

- the check of the integrity will be falsy if a user pass a non latest hash deleted by GC (store all deleted hashes?).
- the data base which contains stored deleted hashes should respect the confidentiality and should be secured (store hashes in www-xo ?)
- stored deleted hashes number limitation

### Logs consolidation

To optimise the storing of logs, we can store consolidated logs. Unfortunately, we'll have the same limitation as the [Integrity check second solution](#secondSolution).

To avoid this limitation, we can consolidate the logs on fetch.

### logs export

The plugin should be able to export the audit logs.

The logs should be exportable:
- by calling an API method: the logs should be formatted in `ndjson`
- via email/browser: the logs should be compressed using `GZIP`


### logs backup / restoration

The plugin should provide a way to backup hashes and to restore them.

##### Limitation

The plugin should update all hashes on restore which will leads to the same limitation as the [Integrity check second solution](#secondSolution).
