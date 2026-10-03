-- 0007_event_start_date.sql: 为重要日程与计划增加可选的创建/起始日期
ALTER TABLE custom_events ADD COLUMN start_date TEXT;
