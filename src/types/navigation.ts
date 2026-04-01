export type AppTabParamList = {
  Dashboard: undefined;
  Card: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  EditProfile: undefined;
  DocumentViewer:
    | {
        url: string;
        fileName?: string;
        mimeType?: string;
        doc?: {
          file_name?: string;
        };
      }
    | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Register: undefined;
};
