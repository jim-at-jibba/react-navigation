import React from 'react';

import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  MaskedViewIOS,
  View,
  ViewPropTypes,
} from 'react-native';
import SafeAreaView from 'react-native-safe-area-view';

import HeaderTitle from './HeaderTitle';
import HeaderBackButton from './HeaderBackButton';
import ModularHeaderBackButton from './ModularHeaderBackButton';
import HeaderStyleInterpolator from './HeaderStyleInterpolator';
import withOrientation from '../withOrientation';

const APPBAR_HEIGHT = Platform.OS === 'ios' ? 44 : 56;
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 20 : 0;
const TITLE_OFFSET = Platform.OS === 'ios' ? 70 : 56;

const getAppBarHeight = isLandscape => {
  return Platform.OS === 'ios'
    ? isLandscape && !Platform.isPad ? 32 : 44
    : 56;
};

class Header extends React.PureComponent {
  static defaultProps = {
    leftInterpolator: HeaderStyleInterpolator.forLeft,
    leftButtonInterpolator: HeaderStyleInterpolator.forLeftButton,
    leftLabelInterpolator: HeaderStyleInterpolator.forLeftLabel,
    titleFromLeftInterpolator: HeaderStyleInterpolator.forCenterFromLeft,
    titleInterpolator: HeaderStyleInterpolator.forCenter,
    rightInterpolator: HeaderStyleInterpolator.forRight,
  };

  static get HEIGHT() {
    return APPBAR_HEIGHT + STATUSBAR_HEIGHT;
  }

  state = {
    widths: {},
  };

  _getHeaderTitleString(scene) {
    const sceneOptions = this.props.getScreenDetails(scene).options;
    if (typeof sceneOptions.headerTitle === 'string') {
      return sceneOptions.headerTitle;
    }
    return sceneOptions.title;
  }

  _getLastScene(scene) {
    return this.props.scenes.find(s => s.index === scene.index - 1);
  }

  _getBackButtonTitleString(scene) {
    const lastScene = this._getLastScene(scene);
    if (!lastScene) {
      return null;
    }
    const { headerBackTitle } = this.props.getScreenDetails(lastScene).options;
    if (headerBackTitle || headerBackTitle === null) {
      return headerBackTitle;
    }
    return this._getHeaderTitleString(lastScene);
  }

  _getTruncatedBackButtonTitle(scene) {
    const lastScene = this._getLastScene(scene);
    if (!lastScene) {
      return null;
    }
    return this.props.getScreenDetails(lastScene).options
      .headerTruncatedBackTitle;
  }

  _navigateBack = () => {
    requestAnimationFrame(() => {
      this.props.navigation.goBack(this.props.scene.route.key);
    });
  };

  _renderTitleComponent = props => {
    const details = this.props.getScreenDetails(props.scene);
    const headerTitle = details.options.headerTitle;
    if (React.isValidElement(headerTitle)) {
      return headerTitle;
    }
    const titleString = this._getHeaderTitleString(props.scene);

    const titleStyle = details.options.headerTitleStyle;
    const color = details.options.headerTintColor;
    const allowFontScaling = details.options.headerTitleAllowFontScaling;

    // On iOS, width of left/right components depends on the calculated
    // size of the title.
    const onLayoutIOS =
      Platform.OS === 'ios'
        ? e => {
            this.setState({
              widths: {
                ...this.state.widths,
                [props.scene.key]: e.nativeEvent.layout.width,
              },
            });
          }
        : undefined;

    const RenderedHeaderTitle =
      headerTitle && typeof headerTitle !== 'string'
        ? headerTitle
        : HeaderTitle;
    return (
      <RenderedHeaderTitle
        onLayout={onLayoutIOS}
        allowFontScaling={allowFontScaling == null ? true : allowFontScaling}
        style={[color ? { color } : null, titleStyle]}
      >
        {titleString}
      </RenderedHeaderTitle>
    );
  };

  _renderLeftComponent = props => {
    const { options } = this.props.getScreenDetails(props.scene);

    if (
      React.isValidElement(options.headerLeft) ||
      options.headerLeft === null
    ) {
      return options.headerLeft;
    }

    const backButtonTitle = this._getBackButtonTitleString(props.scene);
    const truncatedBackButtonTitle = this._getTruncatedBackButtonTitle(
      props.scene
    );
    const width = this.state.widths[props.scene.key]
      ? (this.props.layout.initWidth - this.state.widths[props.scene.key]) / 2
      : undefined;
    const RenderedLeftComponent = options.headerLeft || HeaderBackButton;
    return (
      <RenderedLeftComponent
        onPress={this._navigateBack}
        pressColorAndroid={options.headerPressColorAndroid}
        tintColor={options.headerTintColor}
        buttonImage={options.headerBackImage}
        title={backButtonTitle}
        truncatedTitle={truncatedBackButtonTitle}
        titleStyle={options.headerBackTitleStyle}
        width={width}
      />
    );
  };

  _renderModularLeftComponent = (
    props,
    ButtonContainerComponent,
    LabelContainerComponent
  ) => {
    const { options } = this.props.getScreenDetails(props.scene);
    const backButtonTitle = this._getBackButtonTitleString(props.scene);
    const truncatedBackButtonTitle = this._getTruncatedBackButtonTitle(
      props.scene
    );
    const width = this.state.widths[props.scene.key]
      ? (this.props.layout.initWidth - this.state.widths[props.scene.key]) / 2
      : undefined;

    return (
      <ModularHeaderBackButton
        onPress={this._navigateBack}
        ButtonContainerComponent={ButtonContainerComponent}
        LabelContainerComponent={LabelContainerComponent}
        pressColorAndroid={options.headerPressColorAndroid}
        tintColor={options.headerTintColor}
        buttonImage={options.headerBackImage}
        title={backButtonTitle}
        truncatedTitle={truncatedBackButtonTitle}
        titleStyle={options.headerBackTitleStyle}
        width={width}
      />
    );
  };

  _renderRightComponent = props => {
    const details = this.props.getScreenDetails(props.scene);
    const { headerRight } = details.options;
    return headerRight || null;
  };

  _renderLeft(props) {
    const { options } = this.props.getScreenDetails(props.scene);

    if (props.scene.index === 0) {
      return null;
    }

    const { transitionPreset } = this.props;

    // On Android, or if we have a custom header left, or if we have a custom back image, we
    // do not use the modular header (which is the one that imitates UINavigationController)
    if (
      transitionPreset !== 'uikit' ||
      options.headerBackImage ||
      options.headerLeft ||
      options.headerLeft === null
    ) {
      return this._renderSubView(
        props,
        'left',
        this._renderLeftComponent,
        this.props.leftInterpolator
      );
    } else {
      return this._renderModularSubView(
        props,
        'left',
        this._renderModularLeftComponent,
        this.props.leftLabelInterpolator,
        this.props.leftButtonInterpolator
      );
    }
  }

  _renderTitle(props, options) {
    const style = {};
    const { transitionPreset } = this.props;

    if (Platform.OS === 'android') {
      if (!options.hasLeftComponent) {
        style.left = 0;
      }
      if (!options.hasRightComponent) {
        style.right = 0;
      }
    } else if (
      Platform.OS === 'ios' &&
      !options.hasLeftComponent &&
      !options.hasRightComponent
    ) {
      style.left = 0;
      style.right = 0;
    }

    return this._renderSubView(
      { ...props, style },
      'title',
      this._renderTitleComponent,
      transitionPreset === 'uikit'
        ? this.props.titleFromLeftInterpolator
        : this.props.titleInterpolator
    );
  }

  _renderRight(props) {
    return this._renderSubView(
      props,
      'right',
      this._renderRightComponent,
      this.props.rightInterpolator
    );
  }

  _renderModularSubView(
    props,
    name,
    renderer,
    labelStyleInterpolator,
    buttonStyleInterpolator
  ) {
    const { scene } = props;
    const { index, isStale, key } = scene;

    const offset = this.props.navigation.state.index - index;

    if (Math.abs(offset) > 2) {
      // Scene is far away from the active scene. Hides it to avoid unnecessary
      // rendering.
      return null;
    }

    const ButtonContainer = ({ children }) => (
      <Animated.View
        style={[buttonStyleInterpolator({ ...this.props, ...props })]}
      >
        {children}
      </Animated.View>
    );

    const LabelContainer = ({ children }) => (
      <Animated.View
        style={[labelStyleInterpolator({ ...this.props, ...props })]}
      >
        {children}
      </Animated.View>
    );

    const subView = renderer(props, ButtonContainer, LabelContainer);

    if (subView === null) {
      return subView;
    }

    const pointerEvents = offset !== 0 || isStale ? 'none' : 'box-none';

    return (
      <View
        key={`${name}_${key}`}
        pointerEvents={pointerEvents}
        style={[styles.item, styles[name], props.style]}
      >
        {subView}
      </View>
    );
  }

  _renderSubView(props, name, renderer, styleInterpolator) {
    const { scene } = props;
    const { index, isStale, key } = scene;

    const offset = this.props.navigation.state.index - index;

    if (Math.abs(offset) > 2) {
      // Scene is far away from the active scene. Hides it to avoid unnecessary
      // rendering.
      return null;
    }

    const subView = renderer(props);

    if (subView == null) {
      return null;
    }

    const pointerEvents = offset !== 0 || isStale ? 'none' : 'box-none';

    return (
      <Animated.View
        pointerEvents={pointerEvents}
        key={`${name}_${key}`}
        style={[
          styles.item,
          styles[name],
          props.style,
          styleInterpolator({
            // todo: determine if we really need to splat all this.props
            ...this.props,
            ...props,
          }),
        ]}
      >
        {subView}
      </Animated.View>
    );
  }

  _renderHeader(props) {
    const left = this._renderLeft(props);
    const right = this._renderRight(props);
    const title = this._renderTitle(props, {
      hasLeftComponent: !!left,
      hasRightComponent: !!right,
    });

    const wrapperProps = {
      style: [StyleSheet.absoluteFill, styles.header],
      key: `scene_${props.scene.key}`,
    };

    const { isLandscape, transitionPreset } = this.props;
    const { options } = this.props.getScreenDetails(props.scene);

    if (
      options.headerLeft ||
      options.headerBackImage ||
      Platform.OS === 'android' ||
      transitionPreset !== 'uikit'
    ) {
      return (
        <View {...wrapperProps}>
          {title}
          {left}
          {right}
        </View>
      );
    } else {
      return (
        <MaskedViewIOS
          {...wrapperProps}
          maskElement={
            <View style={styles.iconMaskContainer}>
              <Image
                source={require('../assets/back-icon-mask.png')}
                style={styles.iconMask}
              />
              <View style={styles.iconMaskFillerRect} />
            </View>
          }
        >
          {title}
          {left}
          {right}
        </MaskedViewIOS>
      );
    }
  }

  render() {
    let appBar;

    if (this.props.mode === 'float') {
      const scenesByIndex = {};
      this.props.scenes.forEach(scene => {
        scenesByIndex[scene.index] = scene;
      });
      const scenesProps = Object.values(scenesByIndex).map(scene => ({
        position: this.props.position,
        progress: this.props.progress,
        scene,
      }));
      appBar = scenesProps.map(this._renderHeader, this);
    } else {
      appBar = this._renderHeader({
        position: new Animated.Value(this.props.scene.index),
        progress: new Animated.Value(0),
        scene: this.props.scene,
      });
    }

    // eslint-disable-next-line no-unused-vars
    const {
      scenes,
      scene,
      position,
      screenProps,
      progress,
      isLandscape,
      ...rest
    } = this.props;

    const { options } = this.props.getScreenDetails(scene);
    const { headerStyle } = options;
    const appBarHeight = getAppBarHeight(isLandscape);
    const containerStyles = [
      styles.container,
      {
        height: appBarHeight,
      },
      headerStyle,
    ];

    return (
      <Animated.View {...rest}>
        <SafeAreaView
          style={containerStyles}
          forceInset={{ top: 'always', bottom: 'never' }}
        >
          <View style={styles.appBar}>{appBar}</View>
        </SafeAreaView>
      </Animated.View>
    );
  }
}

let platformContainerStyles;
if (Platform.OS === 'ios') {
  platformContainerStyles = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, .3)',
  };
} else {
  platformContainerStyles = {
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: StyleSheet.hairlineWidth,
    shadowOffset: {
      height: StyleSheet.hairlineWidth,
    },
    elevation: 4,
  };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Platform.OS === 'ios' ? '#F7F7F7' : '#FFF',
    ...platformContainerStyles,
  },
  appBar: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconMaskContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  iconMaskFillerRect: {
    flex: 1,
    backgroundColor: '#d8d8d8',
    marginLeft: -3,
  },
  iconMask: {
    // These are mostly the same as the icon in ModularHeaderBackButton
    height: 21,
    width: 12,
    marginLeft: 9,
    marginTop: -0.5, // resizes down to 20.5
    alignSelf: 'center',
    resizeMode: 'contain',
  },
  title: {
    bottom: 0,
    left: TITLE_OFFSET,
    right: TITLE_OFFSET,
    top: 0,
    position: 'absolute',
    alignItems: Platform.OS === 'ios' ? 'center' : 'flex-start',
  },
  left: {
    left: 0,
    bottom: 0,
    top: 0,
    position: 'absolute',
  },
  right: {
    right: 0,
    bottom: 0,
    top: 0,
    position: 'absolute',
  },
});

export default withOrientation(Header);
