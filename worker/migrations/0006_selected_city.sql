-- 保存账户的天气城市，供再次登录和其他设备恢复。
ALTER TABLE users ADD COLUMN selected_city TEXT;
