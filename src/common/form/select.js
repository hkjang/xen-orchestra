import classNames from 'classnames'
import isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'
import React from 'react'
import ReactSelect from 'react-select'
import uncontrollableInput from 'uncontrollable-input'
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
} from 'react-virtualized'

const SELECT_STYLE = {
  minWidth: '10em',
}
const MENU_STYLE = {
  overflow: 'hidden',
}

@uncontrollableInput()
export default class Select extends React.PureComponent {
  static defaultProps = {
    maxHeight: 200,

    multi: ReactSelect.defaultProps.multi,
    options: [],
    required: ReactSelect.defaultProps.required,
    valueKey: ReactSelect.defaultProps.valueKey,
  }

  static propTypes = {
    autoSelectSingleOption: PropTypes.bool, // default to props.required
    maxHeight: PropTypes.number,
    options: PropTypes.array.isRequired, // cannot be an object
  }

  _cellMeasurerCache = new CellMeasurerCache({
    fixedWidth: true,
  })

  // https://github.com/JedWatson/react-select/blob/dd32c27d7ea338a93159da5e40bc06697d0d86f9/src/utils/defaultMenuRenderer.js#L4
  _renderMenu (opts) {
    const { focusOption, options, selectValue } = opts

    const focusFromEvent = event =>
      focusOption(options[event.currentTarget.dataset.index])
    const selectFromEvent = event =>
      selectValue(options[event.currentTarget.dataset.index])
    const renderRow = opts2 =>
      this._renderRow(opts, opts2, focusFromEvent, selectFromEvent)

    let focusedOptionIndex = options.indexOf(opts.focusedOption)
    if (focusedOptionIndex === -1) {
      focusedOptionIndex = undefined
    }

    const { length } = options
    const { maxHeight } = this.props
    const { rowHeight } = this._cellMeasurerCache

    let height = 0
    for (let i = 0; i < length; ++i) {
      height += rowHeight({ index: i })
      if (height > maxHeight) {
        height = maxHeight
        break
      }
    }

    return (
      <AutoSizer disableHeight>
        {({ width }) => (
          <List
            deferredMeasurementCache={this._cellMeasurerCache}
            height={height}
            rowCount={length}
            rowHeight={rowHeight}
            rowRenderer={renderRow}
            scrollToIndex={focusedOptionIndex}
            width={width}
          />
        )}
      </AutoSizer>
    )
  }
  _renderMenu = this._renderMenu.bind(this)

  _renderRow (
    {
      focusedOption,
      focusOption,
      inputValue,
      optionClassName,
      optionRenderer,
      options,
      selectValue,
    },
    { index, key, parent, style },
    focusFromEvent,
    selectFromEvent
  ) {
    const option = options[index]
    const { disabled } = option

    return (
      <CellMeasurer
        cache={this._cellMeasurerCache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        <div
          className={classNames('Select-option', optionClassName, {
            'is-disabled': disabled,
            'is-focused': option === focusedOption,
          })}
          data-index={index}
          onClick={disabled ? undefined : selectFromEvent}
          onMouseEnter={disabled ? undefined : focusFromEvent}
          style={style}
          title={option.title}
        >
          {optionRenderer(option, index, inputValue)}
        </div>
      </CellMeasurer>
    )
  }

  componentDidMount () {
    this.componentDidUpdate()
  }

  componentDidUpdate () {
    const { props } = this
    const { autoSelectSingleOption = props.required, options } = props
    if (autoSelectSingleOption && options != null && options.length === 1) {
      const value = options[0][props.valueKey]
      props.onChange(props.multi ? [value] : value)
    }
  }

  render () {
    const { props } = this
    const { multi } = props
    return (
      <ReactSelect
        backspaceToRemoveMessage=''
        clearable={multi || !props.required}
        closeOnSelect={!multi}
        isLoading={!props.disabled && isEmpty(props.options)}
        style={SELECT_STYLE}
        valueRenderer={props.optionRenderer}
        {...props}
        menuRenderer={this._renderMenu}
        menuStyle={MENU_STYLE}
      />
    )
  }
}